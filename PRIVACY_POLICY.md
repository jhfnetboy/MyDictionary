# Privacy Policy for MyDictionary

**Last Updated: November 30, 2024**

## Overview

MyDictionary ("we", "our", or "the extension") is committed to protecting your privacy. This privacy policy explains our data practices for the MyDictionary Chrome extension.

**TL;DR: We collect ZERO data. Everything runs locally in your browser.**

---

## Data Collection

### What We Collect

**Nothing.** MyDictionary does not collect, store, transmit, or share any user data.

Specifically, we do NOT collect:
- Selected text or translations
- Browsing history
- Search queries
- Usage analytics
- Personal information
- IP addresses
- Device information
- Crash reports
- Any other data

### What We Store (Locally Only)

The extension stores the following data **exclusively in your browser's local storage**:

1. **User Preferences**
   - Language settings (English/Chinese)
   - Keyboard shortcut preferences
   - UI theme preferences

2. **Synonym Database**
   - WordNet synonym data (126,000+ words)
   - Stored in IndexedDB after first download
   - Never sent to any server

3. **Translation Cache**
   - Recent translation results for performance optimization
   - Stored temporarily in browser memory
   - Cleared when browser restarts

**All this data stays in your browser and is never transmitted anywhere.**

---

## How The Extension Works

### Local AI Processing

MyDictionary uses AI models that run **entirely in your browser**:

1. **Translation Model**: NLLB-200 (Meta AI)
   - Downloaded from Hugging Face CDN on first use
   - Cached in your browser
   - All translation happens locally

2. **Sentence Embedding Model**: MiniLM-L6-v2 (Microsoft Research)
   - Downloaded from Hugging Face CDN on first use
   - Used for example sentence matching
   - Runs locally in your browser

3. **Synonym Database**: WordNet (Princeton University)
   - Packaged with the extension (2.4 MB)
   - Loaded into IndexedDB on first use
   - No server queries

### Network Requests

The extension makes network requests **only** for:

1. **Initial Model Download** (first use only)
   - Source: Hugging Face CDN (cdn.huggingface.co)
   - Purpose: Download AI model files
   - Frequency: Once per installation
   - Data sent: None (public CDN, no authentication)

2. **Extension Updates** (via Chrome Web Store)
   - Managed automatically by Chrome
   - Standard Chrome extension update mechanism
   - We have no control or visibility into this process

**After initial setup, the extension works completely offline.**

---

## Permissions Explained

MyDictionary requests minimal permissions:

### 1. `storage`
**Why**: Store user preferences and synonym database locally
**Access**: Only your browser's local storage
**Data stored**: Language settings, keyboard shortcuts, cached synonyms
**Transmitted**: Never

### 2. `activeTab`
**Why**: Read selected text from the current page
**Access**: Only the active tab, only when you trigger the extension
**Data accessed**: Only text you explicitly select
**Transmitted**: Never (processed locally)

### 3. `contextMenus`
**Why**: Add "Translate with MyDictionary" to right-click menu
**Access**: None (just adds menu item)
**Data accessed**: None
**Transmitted**: Never

### 4. `scripting`
**Why**: Inject sidebar UI into web pages (fallback only)
**Access**: Current tab when right-click menu is used
**Data accessed**: None
**Transmitted**: Never

### 5. `notifications`
**Why**: Show friendly error messages
**Access**: Browser notification system
**Data accessed**: None
**Transmitted**: Never

**We follow the principle of least privilege** - we only request permissions that are absolutely necessary for core functionality.

---

## Third-Party Services

### Services We Use

1. **Hugging Face CDN** (cdn.huggingface.co)
   - Purpose: Host open-source AI models
   - Data sent: None (public files)
   - Privacy policy: https://huggingface.co/privacy

### Services We DO NOT Use

- ❌ Google Analytics
- ❌ Advertising networks
- ❌ Tracking pixels
- ❌ Social media integrations
- ❌ Cloud storage services
- ❌ Remote logging services
- ❌ Any analytics or telemetry services

---

## Data Retention

Since we don't collect data, there's nothing to retain.

**Local data** (stored in your browser):
- Remains until you uninstall the extension
- Can be manually cleared via Chrome settings
- Automatically deleted when extension is uninstalled

---

## Data Sharing

We do not share any data because we don't collect any data.

Specifically, we do NOT share data with:
- Advertisers
- Analytics providers
- Data brokers
- Third-party services
- Partners or affiliates
- Government agencies (unless legally required)

---

## Children's Privacy

MyDictionary does not collect data from anyone, including children under 13 (or 16 in the EU).

The extension is safe for all ages.

---

## International Users

MyDictionary is available worldwide and respects all privacy laws, including:

- **GDPR** (European Union)
- **CCPA** (California, USA)
- **PIPEDA** (Canada)
- **PDPA** (Singapore)

Compliance is easy because we don't collect any personal data.

---

## Security

While we don't collect data, we still take security seriously:

1. **Code Transparency**
   - Source code available on GitHub
   - Community auditable
   - No obfuscation

2. **Secure Connections**
   - Model downloads use HTTPS
   - No insecure network requests

3. **Browser Sandbox**
   - Extension runs in Chrome's security sandbox
   - Cannot access system files
   - Limited to declared permissions

---

## Your Rights

Since we don't collect data, traditional data rights don't apply. However:

**Right to Deletion**: Uninstall the extension to remove all local data
**Right to Access**: All data is in your browser (chrome://settings)
**Right to Portability**: Export browser data via Chrome settings
**Right to Object**: Don't install or uninstall at any time

---

## Changes to This Policy

If we ever change our data practices (which is unlikely given our privacy-first design), we will:

1. Update this document
2. Change the "Last Updated" date
3. Notify users via extension update notes

**We will never introduce data collection without explicit user consent.**

---

## Open Source Transparency

MyDictionary is open source:

- **Source Code**: https://github.com/jhfnetboy/MyDictionary
- **Issue Tracker**: https://github.com/jhfnetboy/MyDictionary/issues
- **License**: MIT License

You can verify all privacy claims by reviewing the source code.

---

## Contact

For privacy questions or concerns:

- **GitHub Issues**: https://github.com/jhfnetboy/MyDictionary/issues
- **Email**: (Add your support email)

**Please note**: We cannot access, recover, or modify your data because we don't have access to it.

---

## Compliance Certifications

MyDictionary complies with:

- ✅ Chrome Web Store Developer Program Policies
- ✅ Google API Services User Data Policy
- ✅ GDPR (General Data Protection Regulation)
- ✅ CCPA (California Consumer Privacy Act)
- ✅ Limited Use Requirements (Google OAuth)

---

## Summary

**What makes MyDictionary different?**

Most extensions claim to "respect your privacy" while still collecting analytics, crash reports, or usage data.

MyDictionary takes privacy to the extreme:
- **Zero data collection** - Not even anonymized analytics
- **Local AI processing** - Your text never leaves your device
- **Offline-capable** - No ongoing internet requirements
- **Open source** - Fully auditable code
- **Minimal permissions** - Only what's absolutely needed

**Privacy isn't a feature - it's our foundation.**

---

**This privacy policy is written in plain language because we have nothing to hide.**

If you have questions, suggestions, or find any privacy concerns, please open an issue on GitHub. We take privacy seriously and will respond promptly.

---

*MyDictionary - Your words, your browser, your privacy.*
