---
title: Secure Boot Growing Pains
description: Setting up PopOS with Secure Boot
date: 2025-12-24
tags: ["low-level", "linux"]
---

I archived my decade old Windows install I've been moving from machine to machine since my school years, and installed PopOS on my main machine now (previously had Linux on a removable SSD). I'd like to share below what I learned about signing from the pain of setting up "Secure Boot" as I still wanted to dual boot Windows for games with draconian anti-cheats.

### What is Secure Boot?

Secure boot is a mechanism in which the BIOS/UEFI verifies the signatures of the bootloader (the boot stage before the OS kernel). Most boards come preloaded with the Microsoft signing keys for Windows and Microsoft approved binaries. However you can enroll your own keys! 

So I set out and installed a utility called "sbctl" which helps you generate a key, enroll it in the BIOS, and sign your bootloader binary. 

### Cool. That works right?

Not quite. I signed my EFI binaries and the system boots, and I was greeted with a text mode screen. The nvidia kernel modules failed to load because they were unsigned. As I didn’t really care too much about the actual integrity I tried adding “module.sig_enforce=0” to the kernel command line args. But it turns out there is this little snippet of code early in the kernel boot process on x86: 

```c
const char * const *arch_get_ima_policy(void)
{
	if (IS_ENABLED(CONFIG_IMA_ARCH_POLICY) && arch_ima_get_secureboot()) {
		if (IS_ENABLED(CONFIG_MODULE_SIG))
			set_module_sig_enforced(); // <== HERE
		if (IS_ENABLED(CONFIG_KEXEC_SIG))
			set_kexec_sig_enforced();
		return sb_arch_rules;
	}
	return NULL;
}
```

So module signatures are forced on if secure boot is enabled.

### Just sign the kernel modules with those sbctl keys then! 

Well that’s what I thought as well, but the kernel still rejected them. Now it also turns out, the kernel does not trust the BIOS keys, there is a platform keyring (BIOS keys) and a secondary keyring. The kernel only trusts the secondary keyring for loading kernel modules (note the parameter VERIFY_USE_SECONDARY_KEYRING):

```c
…
	return verify_pkcs7_signature(mod, modlen, mod + modlen, sig_len,
				      VERIFY_USE_SECONDARY_KEYRING, // <== HERE
				      VERIFYING_MODULE_SIGNATURE,
				      NULL, NULL);
… 
```

### What are machine owner keys?

Machine owner keys (MOK) is something introduced by the shim bootloader that allows the user to add their own signing keys that shim will trust and pass on to the linux kernel. The secondary keyring is populated by these MOK keys.

Given that the alternative was to recompile the kernel by patching that check to trust the BIOS keys as well, I decided to put the shim bootloader (signed by Microsoft) infront of systemd-boot. Then I generated and enrolled a MOK key and configured DKMS to sign the out of tree modules with the MOK key.

### Did that work?

Finally yes, thankfully. Since I already signed systemd-boot and the kernel EFI binaries with sbctl and enrolled the keys into UEFI, everything works. I could simplify it further by resetting the platform keys and signing the EFI binaries with the MOK key instead.

If there are any powerusers out there who set this up in a less... cursed way, please feel free to share your experience with me 😅 .