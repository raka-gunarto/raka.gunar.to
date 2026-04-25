---
title: Reverse Engineering My Building's HVAC App
description: I just want to control my heating.
date: 2026-04-25
tags: ["reverse-engineering", "home-automation"]
---

I just recently moved into a new flat. It's a great flat overall, but what's not
so great is the heating/cooling system.

It is a "smart" system, and I don't get a thermostat on the wall, rather a buggy
app. The app is for Android 4, so I can't even install it on my phone. The flat
generously comes with an Android tablet that has the app installed, which
"works" but crashes half the time, is very slow, and you just get vague + -
buttons relative to _something_ without a display of the actual numeric
setpoint.

This was unacceptable, so I decided to reverse engineer it (with some help from
my good friend Sonnet 4.6).

### What are we dealing with?

The app is `Titan Remote Access` for a "NetMaster BMS" controller. BMS stands
for Building Management System, a box on the wall that controls the fan coil
units in each room. Mine has two FCU (Fan Coil Unit) devices, one per room.

First step was to pull it apart with [jadx](https://github.com/skylot/jadx), a
Java decompiler for Android DEX bytecode:

```bash
jadx --show-bad-code -d decompiled/ "Titan Remote Access_1.3.1.apk"
```

This gives you a reasonably readable Java source tree. A lot of it is obfuscated
(`a.java`, `b.java`, etc) but the important activity classes like
`ZoneViewActivity.java` survived intact enough to trace.

### The remote transport

Frustratingly, the device is not on LAN. This explains why the LAN port is
connected to is set to bridge mode on the router. I assume it probably has its
own credentials to authenticate with the ISP and connects to an Azure Service
Bus to poll for incoming control messages and posts responses back. The app also
connects to this service to talk to the controller.

(Also as it turns out, the app itself is not slow, the controller just takes a
really long time to post responses back to the message bus)

The addressing (namespace, topic, subscription) is derived entirely from the
NMID (NetMaster ID?), an 8-character hex ID printed on the controller label.
Buried in the decompiled code is a formula that maps the NMID to a set of
integers:

```python
def derive_namespace(nmid: str):
    val     = int(nmid, 16) - 672559477
    rounded = round((val / 2.449150704e9) * 1.59999999e8)
    namespace  = rounded // 10000000
    topic_num  = (rounded % 10000000) // 1000
    client_id  = rounded % 1000
    return namespace, topic_num, client_id
```

From there the Service Bus addresses fall out:

```
tpnmra{namespace}.servicebus.windows.net
topic:        NMT{topic_num:04X}
subscription: F{client_id:03X}
```

### Getting a token

Service Bus needs a SAS (Shared Access Signature) token. The app fetches one
from `rarec.azurewebsites.net`

The request authenticates itself with an HMAC-SHA256 of the current Unix
timestamp, keyed on a hardcoded secret (`TP-DReco1`) I found in the source.

The flow looks something like this:

```python
def _rarec_auth_header(timestamp: int) -> str:
    """
    Build the Authorization header for the rarec token endpoint.
    """
    key = base64.b64encode(b"TP-DReco1").decode()
    mac = hmac.new(key.encode(), str(timestamp).encode(), hashlib.sha256)
    sig = base64.b64encode(mac.digest()).decode()
    return f"RecoveryToken {sig}"


def get_sas_token(nmid: str, http_timeout: float = 15.0) -> dict:
    """
    POST to rarec to get a SAS token for the given NMID.
    Returns: {"Tok": "...", "Exp": unix_timestamp}  (Exp = current_time + 3300)
    """
    nmid = nmid.upper()
    namespace, topic_num, _ = derive_namespace(nmid)
    topic = sb_topic(topic_num)
    ts = int(time.time())

    body = json.dumps({
        "NS":  namespace,
        "Top": topic,
        "Exp": ts, # current time – matches Java: tokenRequest.TokenExpiration = currentTimeMillis
    })
    headers = {
        "Content-Type":  "application/json",
        "Authorization": _rarec_auth_header(ts),
    }

    resp = requests.post(RAREC_URL, headers=headers, data=body, timeout=http_timeout)
    return resp.json()
```

The token comes back with an expiry so you'll have to fetch a new token manually
every one in a while.

### The encryption

Every message body (from both app and controller) is AES-128-CBC encrypted. The
key is derived with PBKDF2-HMAC-SHA1 (1000 iterations) from a session key that
combines the password with the addressing integers:

```python
def session_key(password: str, nmid: str) -> str:
    _, topic_num, client_id = derive_namespace(nmid)
    return f"{password}{client_id:03X}{topic_num:04X}"
```

The encrypted bundle packs the salt and IV at fixed offsets from the _end_:

```
ciphertext || salt(16 bytes) || padding(6 bytes) || iv(16 bytes)
```

So to decrypt you slice off the last 16 bytes for the IV, the 16 bytes before
the padding for the salt, and everything else is ciphertext.

### The packet structure

Inside the encrypted envelope is a binary framing with sections and items:

```
[total_len : 2 bytes LE][seq_num : 1 byte][sections...]
```

Each section has a service type (authenticate, read/write access, zone init,
...) and carries a list of items. Each item is a data type byte, a 2-byte
length, and a UTF-8 JSON string. The actual commands are BACnet (Building
Automation and Control networks communication protocol, an ISO standard
apparently) read/write requests serialised as JSON and packed inside this binary
envelope, which is then encrypted and POSTed to Service Bus.

Essentially it's a REST API wrapped in a binary protocol wrapped in CBC
encryption.

### Finding the right objects to read

Once the transport was working I could authenticate and start poking at BACnet
objects. My first assumption was that temperature lived in `AV1` (Analog Value
1). When it returned 0 I was clearly wrong (lol).

After tracing through the decompiled class that hydrates zone objects from the
device's initialization response, I found how the app maps BACnet objects to
zone fields:

```java
hVar.f5451r = linkedHashMap2.get(String.format("AV10%d01", zone));  // room temp
hVar.f5446l = linkedHashMap2.get(String.format("AV10%d02", zone));  // ambient temp
hVar.f5447m = linkedHashMap2.get(String.format("AV10%d03", zone));  // setpoint  ← this one
hVar.f5445k = linkedHashMap2.get(String.format("MSV10%d01", zone)); // fan / zone power
```

| Object          | Zone 1     | Meaning                          |
| --------------- | ---------- | -------------------------------- |
| `AV10{zone}01`  | `AV10101`  | Room temperature (°C, read-only) |
| `AV10{zone}03`  | `AV10103`  | Setpoint (°C, read/write)        |
| `MSV308`        | —          | HVAC mode (device-level)         |
| `MSV10{zone}01` | `MSV10101` | Fan speed + zone power           |

The fan/power object doubles as both the on/off switch and the speed setting as
there's no separate object for on/off on this device type. State 1 is on/auto, 2
is boost, 3 is off.

### Talking to it

Putting it all together, authentication is a single Service Bus round-trip: POST
an encrypted packet containing your NMID, receive back a JSON payload listing
all zone devices and their BACnet instance numbers.

```python
client = NetMasterRemote(nmid="mynmid", password="mypassword")
auth = client.authenticate()
# {'ZoneList': [{'DevID': 20651, 'Name': 'Living Room', ...}, ...]}
```

From there reading/writing a value encrypts a BACnet read/write request, POSTs
it to Service Bus, polls the subscription for the response, decrypts it, and
unpacks the value. After making nice wrappers for constructing the data packets
and receiving the values back from Azure Service Bus, it was a breeze:

```python
# Room temperature and setpoint
temp    = client.bacread(20651, "AV10101")   # → 23.4
setpoint = client.bacread(20651, "AV10103")  # → 21.0
```

```python
client.bacwrite(20651, "AV10103", 22.0)  # set temperature
client.bacwrite(20651, "MSV10101", 2)    # fan boost
client.bacwrite(20651, "MSV10101", 3)    # turn zone off
```

### Is it working?

Yes. Both FCUs respond to commands and the status reads look correct. But boy
was it a pain. I'd rather just have a thermostat with a dial on the wall or
something.

But in the end, I ended up writing a nice Home Assistant integration that lets
me read out the temperature sensors in each room and set the temperature. That
tablet can just stay in the closet and I can now automate my heating and cooling
:)
