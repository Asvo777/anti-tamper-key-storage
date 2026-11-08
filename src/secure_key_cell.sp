* Custom CMOS Security Cell with Integrated Ground-Isolation Erase Gate
* Technology Node: Generic 130nm CMOS | VDD = 1.2V

.PARAM VDD_VAL=1.2V
VVDD VDD 0 VDD_VAL
VTAMPER TAMPER_LINE 0 PULSE(1.2V 0V 50ns 1ns 1ns 100ns)

* --- CROSS-COUPLED CMOS STORAGE LATCH ---
* PMOS Pull-Up Transistors (W=240nm, L=130nm)
M1 Q_BAR Q VDD VDD PMOS W=240n L=130n
M2 Q Q_BAR VDD VDD PMOS W=240n L=130n

* NMOS Pull-Down Transistors (W=120nm, L=130nm)
M3 Q_BAR Q V_GND 0 NMOS W=120n L=130n
M4 Q Q_BAR V_GND 0 NMOS W=120n L=130n

* --- THE ASYNCHRONOUS ANTI-TAMPER ERASE SWITCH ---
* This NMOS transistor isolates the latch from Ground.
* When TAMPER_LINE drops to 0V, M5 opens up, cutting off the ground path,
* collapsing the logic state instantly and draining internal charge.
M5 V_GND TAMPER_LINE 0 0 NMOS W=480n L=130n

* --- SIMULATION COMMANDS ---
.TRAN 0.1ns 100ns
.PLOT TRAN V(Q) V(TAMPER_LINE)
.END