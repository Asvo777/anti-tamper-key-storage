# Ultra-Low-Latency Secure Anti-Tamper Key Storage Core

## Project Overview
This project implements a hardware-level **Always-On Secure Key Storage Module** designed to hold a 1-bit cryptographic master key. It models the low-power hardware security vaults used in modern smartphone and wearable SOCs (like Apple's Secure Enclave). 

Instead of relying on slow software-level security patches, this chip utilizes hardwired gate-level logic and mixed-signal CMOS physics to **instantly sanitize (erase) critical keys in less than one clock cycle** the microsecond a physical tamper or frame-breach event occurs.

## Key Features
* **Zero-Cycle Hardware Erase:** Instantaneous asynchronous wipe completely bypassing the main CPU and software operating system.
* **Dual-Layer Implementation:** Complete RTL Verilog implementation mapped alongside a custom, transistor-level Static CMOS SPICE model.
* **Low Footprint Optimization:** Designed using purely synchronous register paths and simple combinational gates, minimizing active dynamic silicon area.

## Technical Specifications
* **Process Technology Node:** Optimized for generic 130nm / 90nm CMOS Manufacturing
* **Supply Voltage (VDD):** 1.2V to 1.8V
* **Sanitization Latency:** < 1.5 ns (transistor-level propagation delay)
