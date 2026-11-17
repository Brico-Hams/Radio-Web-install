# FTX-1 Series CAT Operation Reference Manual (rev. 2507-B)

Texto extraído de `FTX-1_CAT_OM_ENG_2507-B.pdf` (29 páginas) com `pdftotext -layout`, página a página, 
para uso como contexto. Tabelas e diagramas aparecem como texto alinhado; em caso de dúvida consulte o PDF.


## Página 1

```text
HF/50/144/430MHz ALL MODE TRANSCEIVER




      CAT Operation Reference Manual

                           Important Notes
 The CAT operation does not work with MAIN Firmware before Ver. 1.08.
 Please update the MAIN firmware to Ver. 1.08 or later.

  How to Confirm the Firmware Version
 1. Press and hold the [FUNC] knob.




 2. Touch [EXTENSION SETTING].
    If [EXTENSION SETTING] is not displayed,
    touch [FWD→] to display [EXTENSION
    SETTING] and then touch it.




 3. Touch [SOFT VERSION].                      Current MAIN firmware version
    The versions of each firmware will be
    displayed on the TFT screen.
```


## Página 2

```text
 CAT (Computer Aided Transceiver) Operation
                                                 Overview
The CAT (Computer Aided Transceiver) System in the FTX-1 series transceiver provides control of frequency,
VFO, memory, and other settings using an external personal computer. This allows multiple control operations to
be fully automated with single mouse clicks, or keystroke operations on the computer keyboard.

  YAESU MUSEN does not produce CAT System operating software due to the wide variety of personal computers
  and operating systems in use today. However, the information provided in this chapter explains the serial data
  structure and opcodes used by the CAT system. This information, along with the short programming examples,
  is intended to help you start writing programs on your own. As you become more familiar with CAT operation,
  you can customize programs for your operating needs and utilize the full operating potential of this system.


Using the USB Cable (CAT-1 / CAT-2)
The FTX-1 transceiver has a built-in USB to Dual UART Bridge, allowing direct connection from the side-panel USB
jack to the USB jack of a computer without the need for an interface device, simply use a USB cable to connect
to the USB jack on the computer.
                                                 PC

       To connect to a PC using a USB cable,
       a Virtual COM port driver must be in-
       stalled on the PC.
       Visit the Yaesu website http://www.yae-                                    USB Cable
       su.com/ to download the Virtual COM
       port driver and Installation Manual.
                                                                         USB           USB type-C

                                                                                                      FTX-1 field




   How to Confirm the Installation, and the COM Port Number
   After the FTX-1 and computer are connected, confirm that the virtual COM driver has been installed successfully:
   1. Press and hold the power switch to turn the transceiver ON.
   2. Connect the transceiver and PC with a commercially available USB cable (type-C).
   3. Open the “Device Manager” screen in Windows.
   4. On the Device Manager screen, double-click “Port (COM & LPT)”.




      “Silicon Labs Dual CP210x USB to UART Bridge : Enhanced COM Port (COM**)”
      “Silicon Labs Dual CP210x USB to UART Bridge : Standard COM Port (COM**)”
                                *(The number in the “(COM**)” portion may vary from computer to computer.)
      The above example indicates that COM5 can be used for CAT communications (CAT-1), while COM6 can
      be used for TX control (PTT, CW Keying, Digital Mode Operation) or CAT communications (CAT-2).
      When performing software port configuration, select the COM port numbers that were confirmed using the
      procedure above.

              If a “!” or “X” is displayed for the port on the Device Manager, uninstall and reinstall the virtual
              COM driver.


                                                        1
```


## Página 3

```text
CAT (Computer Aided Transceiver) Operation
The FTX-1 contains two virtual COM ports, an Enhanced COM Port and a Standard COM Port.
These ports offer the following functions:
• Enhanced COM Port (CAT-1): CAT Communications (Frequency and Communication Mode Settings)
• Standard COM Port (CAT-2): TX Controls (PTT control, CW Keying, Digital Mode Operation) or CAT
                                    Communications (Frequency and Communication Mode Settings)*
When performing software port configuration, select the COM port numbers that were confirmed using the
procedure above, use the two confirmed COM port numbers for each software function. The frequency and
communication mode and PTT control can be set from the software, and CW keying, digital communication,
etc. can be performed simultaneously.
*NOTE: (When using a standard COM port (CAT-2) for CAT communication (setting frequency, communication
mode, etc.) and using hardware flow control by RTS or DTR, be sure to set the following menu items to “OFF”
(factory default) to disable PTT control by RTS or DTR.)
     Menu Item                                  Menu Function      Available Settings (Default: Bold)
                          MODE SSB              RPTT SELECT        OFF / RTS / DTR
                          MODE AM               RPTT SELECT        OFF / RTS / DTR
     RADIO SETTING        MODE FM               RPTT SELECT        OFF / RTS / DTR
                          MODE DATA             RPTT SELECT        OFF / RTS / DTR
                          MODE RTTY             RPTT SELECT        OFF / RTS / DTR
                                                RPTT SELECT        OFF / RTS / DTR
     CW SETTING           MODE CW
                                                PC KEYING          OFF / RTS / DTR
     PRESET               PRESET1 - 5           RPTT SELECT        OFF / RTS / DTR


       • If a transceiver with a different serial number is connected and turned on, different COM port numbers
         will be assigned to it, making it possible to perform individual COM port configurations for separate
         transceivers.
       • When using the USB cable for TX control, the transceiver may switch to the transmit mode when the
         computer is started.
       • Always close the application on the computer before disconnecting the USB cable.




                                                     2
```


## Página 4

```text
 CAT (Computer Aided Transceiver) Operation
Using the UART (CAT-3)
The TUNER/LINEAR jack on the rear panel of the FTX-1 field head can be used for CAT communication (5V
CMOS level serial communication).
Set to “CAT-3” in the setting menu [OPERATION SETTING] → [GENERAL] → [TUN/LIN PORT SELECT]. (Factory
setting: OPTION)

         • Since the serial communication of this jack is 5V CMOS level, it cannot be directly connected to the
           RS-232C terminal of the PC.
         • The connection cable must be prepared by yourself using the optional band data cable T9207451A
           (mini DIN 10-pin to DIN 10-pin).
         • CAT communication cannot be used simultaneously with an external antenna tuner or linear amplifier.




                                                                              +13.8V          GND

                                                                              TX D


                                                                                       RX D

             Pin Name      I/O                                 Function
               +13V        –                       13 VDC output linked to radio ON
               GND         –                                 Signal Ground
               TXD       Output     Outputs the Serial Data from the transceiver to the PC (5V CMOS)
               RXD        Input     Inputs the Serial Data from the PC to the transceiver (5V CMOS)

Communication Parameters
 • Asynchronous communication
 • Baud rate: 38400bps* (CAT-1, CAT-3 terminals) or 4800bps* (CAT-2 terminal)
 • Start bit:  1
 • Data bits: 8
 • Stop bits: 1 or 2* (CAT-2: 1 (Fixed))
 • Paritybits: None
   *(Factory default)
CAT communication settings can be changed using the following menu items.

 Menu Item                           Menu Function                  Available Settings (Default: Bold)
                                     CAT-1 RATE                     4800 / 9600 / 19200 / 38400 / 115200 (bps)
                                     CAT-1 TIME OUT TIMER           10 / 100 / 1000 / 3000 (msec)
                                     CAT-1 CAT-3 STOP BIT           1bit / 2bit
 OPERATION SETTING       GENERAL     CAT-2 RATE                     4800 / 9600 / 19200 / 38400 / 115200 (bps)
                                     CAT-2 TIME OUT TIMER           10 / 100 / 1000 / 3000 (msec)
                                     CAT-3 RATE                     4800 / 9600 / 19200 / 38400 / 115200 (bps)
                                     CAT-3 TIME OUT TIMER           10 / 100 / 1000 / 3000 (msec)




                                                       3
```


## Página 5

```text
 CAT (Computer Aided Transceiver) Operation
                                         Control Command
A computer control command is composed of an alphabetical command, various parameters, and the terminator
that signals the end of the control command.
Example: Set the MAIN-side frequency to 14.250000 MHz.
      FA           014250000 ;
                           
      Command      Parameter Terminator
There are three commands for the FTX-1 as shown below:
   Set command: Set a particular condition        (to the FTX-1)
   Read command: Reads an answer		                (from the FTX-1)
   Answer command: Transmits a condition          (from the FTX-1)
For example, note the following case of the FA command (Set the MAIN-side frequency):
 To set the MAIN-side frequency to 14.250000 MHz, the following command is sent from the computer to the
  transceiver:
		     “FA014250000;” (Set command)
 To read the MAIN-side frequency, the following command is sent from the computer to the transceiver:
		     “FA;” (Read command)
 When the Read command above has been sent, the following command is returned to the computer:
		     “FA014250000;” (Answer command)

Alphabetical Commands
A command consists of 2 alphabetical characters.
You may use either lower or upper case characters. The commands available for this transceiver are listed in the
“PC Control Command Tables” on the following pages.

Parameters
Parameters are used to specify information necessary to implement the desired command.
The parameters to be used for each command are predetermined. The number of digits assigned to each param-
eter is also predetermined. Refer to the “Control Command List” and the “Control Command Tables” to configure
the appropriate parameters.
When configuring parameters, be careful not to make the following mistakes.
For example,
when the correct parameter is “IS00+1000” (IF SHIFT):
   IS001000;
      Not enough parameters specified (No direction (+) given for the IF shift)
   IS00+100;
      Not enough digits (Only three frequency digits given)
   IS00_+_1000;
      Unnecessary characters between parameters
   IS00+10000;
      Too many digits (Five frequency digits given)
Note: If a particular parameter is not applicable to the FTX-1, the parameter digits should be filled using any
character except the ASCII control codes (00 to 1Fh) and the terminator (;).

Terminator
To signal the end of a command, it is necessary to use a semicolon (;). The digit where this special character must
appear differs depending on the command used.




                                                        4
```


## Página 6

```text
CAT (Computer Aided Transceiver) Operation
                                  CAT Control Command List
Command             Function       Set Read Ans.   AI       Command             Function         Set Read Ans.   AI
  AB      MAIN-side to SUB-side    O    X    X     X          MR      MEMORY READ                X    O    O     X

  AC      ANTENNA TUNER            O    O    O     O          MS      METER SW                   O    O    O     O
          CONTROL
                                                              MT      MEMORY CHANNEL             O    O    O     X
  AG      AF GAIN                  O    O    O     O                  WRITE/TAG
  AI      AUTO INFORMATION         O    O    O     X          MW      MEMORY WRITE               O    X    X     X

  AM      MAIN-side to MEMORY      O    X    X     X          MX      MOX SET                    O    O    O     O
          CHANNEL
                                                              MZ      SPLIT MEMORY               O    O    O     O
  AO      AMC OUTPUT LEVEL         O    O    O     O
                                                              NA      NARROW                     O    O    O     O
  BA      SUB-side to MAIN-side    O    X    X     X
                                                              NL      NOISE BLANKER LEVEL        O    O    O     O
  BC      AUTO NOTCH (DNF)         O    O    O     O
                                                                      OPPOSITE BAND (SUB-side)
  BD      BAND DOWN                O    X    X     X          OI                                 X    O    O     O
                                                                      INFORMATION
  BI      BREAK-IN                 O    O    O     O          OS      OFFSET (Repeater Shift)    O    O    O     O

  BM      SUB-side to MEMORY       O    X    X     X          PA      PRE-AMP (IPO)              O    O    O     O
          CHANNEL
                                                              PB      PLAY BACK                  O    O    O     X
  BP      MANUAL NOTCH             O    O    O     O
                                                              PC      POWER CONTROL              O    O    O     O
  BS      BAND SELECT              O    X    X     X
                                                              PL      SPEECH PROCESSOR           O    O    O     O
  BU      BAND UP                  O    X    X     X                  LEVEL
  CF      CLAR (Clarifier)         O    O    O     O          PR      SPEECH PROCESSOR           O    O    O     O
  CH      CHANNEL UP/DOWN          O    X    X     X          PS      POWER SWITCH               O    O    O     X
  CN      CTCSS NUMBER             O    O    O     O          QI      QMB STORE                  O    X    X     X
  CO      CONTOUR/APF              O    O    O     O          QR      QMB RECALL                 O    X    X     X
  CS      CW SPOT                  O    O    O     O          RA      RF ATTENUATOR              O    O    O     O
  CT      CTCSS                    O    O    O     O          RG      RF GAIN                    O    O    O     O
  DA      LCD CONTRAST/DIMMER      O    O    O     X          RI      RADIO INFORMATION          X    O    O     O
  DN      DOWN                     O    X    X     X          RL      NOISE REDUCTION (DNR)      O    O    O     O
                                                                      LEVEL
  DT      DATE AND TIME            O    O    O     X
                                                              RM      READ METER                 X    O    O     O
  EX      MENU                     O    O    O     O
                                                              SC      SCAN                       O    O    O     O
  FA      FREQUENCY MAIN-side      O    O    O     O
                                                              SD      SEMI BREAK-IN DELAY        O    O    O     O
  FB      FREQUENCY SUB-side       O    O    O     O                  TIME
  FN      FINE TUNING              O    O    O     O          SF      SUB DIAL                   O    O    O     O
  FR      FUNCTION RX              O    O    O     O          SH      WIDTH                      O    O    O     O
  FT      FUNCTION TX              O    O    O     O          SM      S METER                    X    O    O     X
  GP      GP OUT A/B/C/D           O    O    O     X          SQ      SQUELCH LEVEL              O    O    O     O
  GT      AGC FUNCTION             O    O    O     O          SS      SPECTRUM SCOPE             O    O    O     O
  ID      IDENTIFICATION           X    O    O     X          ST      SPLIT                      O    O    O     O
          INFORMATION (MAIN-                                  SV      SWAP VFO                   O    X    X     X
  IF                               X    O    O     O
          side)
                                                              TS      TXW                        O    O    O     O
  IS      IF SHIFT                 O    O    O     O
                                                              TX      TX SET                     O    O    O     O
  KM      KEYER MEMORY             O    O    O     X
                                                              UP      UP                         O    X    X     X
  KP      KEY PITCH                O    O    O     O
                                                              VD      VOX DELAY TIME             O    O    O     O
  KR      KEYER                    O    O    O     O
                                                              VE      FIRMWARE VERSION           X    O    O     X
  KS      KEY SPEED                O    O    O     O
                                                              VG      VOX GAIN                   O    O    O     O
  KY      CW KEYING MEMORY         O    X    X     X
          PLAY                                                VM      [V/M(MW)] KEY FUNCTION     O    X    X     X
  LK      LOCK                     O    O    O     O          VM      [V/M(MW)] KEY FUNCTION     O    O    O     O
  LM      LOAD MESSAGE             O    O    O     X          VS      VFO SELECT                 O    O    O     O

  MA      MEMORY CHANNEL to        O    X    X     X          VX      VOX                        O    O    O     O
          MAIN-side
                                                              ZI      ZERO IN                    O    X    X     X
  MB      MEMORY CHANNEL to        O    X    X     X
          SUB-side
  MC      MEMORY CHANNEL           O    O    O     X
  MD      MODE                     O    O    O     O
  MG      MIC GAIN                 O    O    O     O
  ML      MONITOR LEVEL            O    O    O     O


                                                        5
```


## Página 7

```text
CAT (Computer Aided Transceiver) Operation
AB       MAIN-side to SUB-side
         1   2     3   4   5   6     7   8   9   10
Set
         A   B     ;
         1   2     3   4   5   6     7   8   9   10
Read
         1   2     3   4   5   6     7   8   9   10
Answer


AC       ANTENNA TUNER CONTROL
                                                      P1 0: Internal Antenna Tuner (FTX-1 optima)
         1   2     3   4   5   6     7   8   9   10
                                                         1: External Antenna Tuner
Set                                                   P2 0: External Antenna Tuner
         A   C   P1 P2 P3        ;                       1: -
                                                         2: ATAS
         1   2     3   4   5   6     7   8   9   10   P3 P2=0 (Antenna Tuner):
Read                                                  		 0: Tuner “OFF” (Tuning Stop)
         A   C     ;                                  		 1: Tuner “ON”
                                                      		 2: -
                                                      		 3: Tuning Start
         1   2     3   4   5   6     7   8   9   10
                                                         P2=2 (ATAS):
                                                      		 0: Tuning Stop
Answer                                                		 1: Tuning frequency up (50 msec)
         A   C   P1 P2 P3        ;                    		 2: Tuning frequency down (50 msec)
                                                      		 3: Tuning Start


AG       AF GAIN
         1   2     3   4   5   6     7   8   9   10   P1 0: MAIN-side
Set
         A   G   P1 P2 P2 P2         ;                   1: SUB-side
         1   2     3   4   5   6     7   8   9   10   P2 000 - 255
Read
         A   G   P1    ;
         1   2     3   4   5   6     7   8   9   10
Answer
         A   G   P1 P2 P2 P2         ;


AI       AUTO INFORMATION
         1   2     3   4   5   6     7   8   9   10   P1 0: Auto Information “OFF”
Set                                                      1: Auto Information “ON”
         A   I   P1    ;
         1   2     3   4   5   6     7   8   9   10   NOTES:
Read                                                   • When the status of the radio changes, the Read value of the AI applicable command (see
         A   I     ;                                     “CAT Control Command List” (page 5)) is automatically sent to the PC.
         1   2     3   4   5   6     7   8   9   10    • Set ON/OFF for each CAT-1, CAT-2, and CAT-3.
Answer                                                 • This parameter is set to “0” (OFF) automatically when the transceiver is turned “OFF”.
         A   I   P1    ;


AM       MAIN-SIDE TO MEMORY CHANNEL
         1   2     3   4   5   6     7   8   9   10
Set
         A   M     ;
         1   2     3   4   5   6     7   8   9   10
Read
         1   2     3   4   5   6     7   8   9   10
Answer


AO       AMC OUTPUT LEVEL
         1   2     3   4   5   6     7   8   9   10   P1 001-100: AMC OUTPUT LEVEL
Set
         A   O   P1 P1 P1        ;
         1   2     3   4   5   6     7   8   9   10
Read
         A   O     ;
         1   2     3   4   5   6     7   8   9   10
Answer
         A   O   P1 P1 P1        ;


BA       SUB-side to MAIN-side
         1   2     3   4   5   6     7   8   9   10
Set
         B   A     ;
         1   2     3   4   5   6     7   8   9   10
Read
         1   2     3   4   5   6     7   8   9   10
Answer




                                                                6
```


## Página 8

```text
CAT (Computer Aided Transceiver) Operation
BC       AUTO NOTCH (DNF)
         1   2   3    4   5   6   7   8   9   10   P1 0: MAIN-side
Set
         B   C   P1 P2    ;                           1: SUB-side
         1   2   3    4   5   6   7   8   9   10   P2 0: Auto Notch “OFF”
Read                                                  1: Auto Notch “ON”
         B   C   P1   ;
         1   2   3    4   5   6   7   8   9   10
Answer
         B   C   P1 P2    ;


BD       BAND DOWN
         1   2   3    4   5   6   7   8   9   10   P1 0: MAIN-side
Set
         B   D   P1   ;                               1: SUB-side
         1   2   3    4   5   6   7   8   9   10
Read
         1   2   3    4   5   6   7   8   9   10
Answer


BI       BREAK-IN
         1   2   3    4   5   6   7   8   9   10   P1 0: Break-in “OFF”
Set
         B   I   P1   ;                               1: Break-in “ON”
         1   2   3    4   5   6   7   8   9   10
Read
         B   I   ;
         1   2   3    4   5   6   7   8   9   10
Answer
         B   I   P1   ;


BM       SUB-side to MEMORY CHANNEL
         1   2   3    4   5   6   7   8   9   10
Set
         B   M   ;
         1   2   3    4   5   6   7   8   9   10
Read
         1   2   3    4   5   6   7   8   9   10
Answer


BP       MANUAL NOTCH
         1   2   3    4   5   6   7   8   9   10   P1 0: MAIN-side
Set                                                   1: SUB-side
         B   P   P1 P2 P3 P3 P3       ;            P2 0: Manual NOTCH “ON/OFF”
         1   2   3    4   5   6   7   8   9   10      1: Manual NOTCH Frequency
Read                                               P3 P2=0
         B   P   P1 P2    ;                        		    000: “OFF”
         1   2   3    4   5   6   7   8   9   10
                                                         001: “ON”
Answer                                                P2=1
         B   P   P1 P2 P3 P3 P3       ;            		 001 - 320 (NOTCH Frequency : x 10 Hz )


BS       BAND SELECT
         1   2   3    4   5   6   7   8   9   10   P1 0: MAIN-side
Set
         B   S   P1 P2 P2     ;                       1: SUB-side
         1   2   3    4   5   6   7   8   9   10   P2 00: 1.8 MHz     04: 10 MHz   08: 24.5 MHz   12: AIR
Read                                                  01: 3.5 MHz     05: 14 MHz   09: 28 MHz     13: 144 MHz
                                                      02: 5 MHz       06: 18 MHz   10: 50 MHz     14: 430 MHz
         1   2   3    4   5   6   7   8   9   10
Answer                                                03: 7 MHz       07: 21 MHz   11: 70 MHz/GEN



BU       BAND UP
         1   2   3    4   5   6   7   8   9   10   P1 0: MAIN-side
Set
         B   U   P1   ;                               1: SUB-side
         1   2   3    4   5   6   7   8   9   10
Read
         1   2   3    4   5   6   7   8   9   10
Answer




                                                            7
```


## Página 9

```text
CAT (Computer Aided Transceiver) Operation
CF       CLAR ON/OFF
         1     2   3     4   5      6     7   8         9     10     11   P1 0: MAIN-side                    P3=1 (CLAR Frequency):
Set                                                                          1: SUB-side                       P4     +/-
         C     F   P1 P2 P3 P4 P5 P6 P7 P8                            ;   P2 0: (Fixed)                        P5-P8 0000 - 9999 Hz
                                                                          P3 0: CLAR Setting
         1     2   3     4   5      6     7   8         9     10     11      1: CLAR Frequency
Read                                                                      P3=0 (CLAR Setting):
         C     F   P1 P2 P3         ;                                       P4       0: RX CLAR OFF
                                                                          			        1: RX CLAR ON
         1     2   3     4   5      6     7   8         9     10     11     P5       0: TX CLAR OFF
Answer                                                                    			        1: TX CLAR ON
         C     F   P1 P2 P3 P4 P5 P6 P7 P8                            ;     P6-P8 0: (Fixed)



CH       CHANNEL UP/DOWN
         1     2   3     4   5      6     7   8         9     10    P1 0: Memory Channel “UP”
Set
         C     H   P1    ;                                             1: Memory Channel “DOWN”
         1     2   3     4   5      6     7   8         9     10
Read
         1     2   3     4   5      6     7   8         9     10
Answer


CN       CTCSS TONE FREQUENCY / DCS CODE
         1     2   3     4   5      6     7   8         9     10    P1 0: MAIN-side
Set                                                                    1: SUB-side
         C     N   P1 P2 P3 P3 P3             ;                     P2 0: CTCSS
         1     2   3     4   5      6     7   8         9     10       1: DCS
Read                                                                P3 P2=0 (CTCSS)       000 - 049: Tone Frequency Number (See Table 1)
         C     N   P1 P2      ;                                        P2=1 (DCS)         000 - 103: DCS Number (See Table 2)
         1     2   3     4   5      6     7   8         9     10
Answer
         C     N   P1 P2 P3 P3 P3             ;


                                                             Table 1 (CTCSS Tone Chart)
             000   67.0 Hz        009    91.5 Hz            018      123.0 Hz       027   162.2 Hz     036     189.9 Hz    045     229.1 Hz
             001   69.3 Hz        010    94.8 Hz            019      127.3 Hz       028   165.5 Hz     037     192.8 Hz    046     233.6 Hz
             002   71.9 Hz        011    97.4 Hz            020      131.8 Hz       029   167.9 Hz     038     196.6 Hz    047     241.8 Hz
             003   74.4 Hz        012    100.0 Hz           021      136.5 Hz       030   171.3 Hz     039     199.5 Hz    048     250.3 Hz
             004   77.0 Hz        013    103.5 Hz           022      141.3 Hz       031   173.8 Hz     040     203.5 Hz    049     254.1 Hz
             005   79.7 Hz        014    107.2 Hz           023      146.2 Hz       032   177.3 Hz     041     206.5 Hz     -          -
             006   82.5 Hz        015    110.9 Hz           024      151.4 Hz       033   179.9 Hz     042     210.7 Hz     -          -
             007   85.4 Hz        016    114.8 Hz           025      156.7 Hz       034   183.5 Hz     043     218.1 Hz     -          -
             008   88.5 Hz        017    118.8 Hz           026      159.8 Hz       035   186.2 Hz     044     225.7 Hz     -          -

                                                                  Table 2 (DCS Code Chart)
             000   023       015        074       030         165         045       261   060        356     075     462     090      627
             001   025       016        114       031         172         046       263   061        364     076     464     091      631
             002   026       017        115       032         174         047       265   062        365     077     465     092      632
             003   031       018        116       033         205         048       266   063        371     078     466     093      654
             004   032       019        122       034         212         049       271   064        411     079     503     094      662
             005   036       020        125       035         223         050       274   065        412     080     506     095      664
             006   043       021        131       036         225         051       306   066        413     081     516     096      703
             007   047       022        132       037         226         052       311   067        423     082     523     097      712
             008   051       023        134       038         243         053       315   068        431     083     526     098      723
             009   053       024        143       039         244         054       325   069        432     084     532     099      731
             010   054       025        145       040         245         055       331   070        445     085     546     100      732
             011   065       026        152       041         246         056       332   071        446     086     565     101      734
             012   071       027        155       042         251         057       343   072        452     087     606     102      743
             013   072       028        156       043         252         058       346   073        454     088     612     103      754
             014   073       029        162       044         255         059       351   074        455     089     624      -        -


CO       CONTOUR
         1     2   3     4   5      6     7   8         9     10    P1 0: MAIN-side         P3 P2=0 0000: CONTOUR “OFF”
Set                                                                    1: SUB-side			               0001: CONTOUR “ON”
         C     O   P1 P2 P3 P3 P3 P3                    ;
                                                                    P2 0: CONTOUR “ON/OFF”		   P2=1 0010 - 3200
         1     2   3     4   5      6     7   8         9     10
Read                                                                   1: CONTOUR FREQ			           (CONTOUR Frequency:10 - 3200Hz)
         C     O   P1 P2      ;                                        2: APF “ON/OFF”		       P2=2 0000: APF “OFF”
         1     2   3     4   5      6     7   8         9     10       3: APF FREQ			               0001: APF “ON”
Answer                                                              			                        P2=3 0000 - 0050 (APF Frequency: -250 - 250 Hz )
         C     O   P1 P2 P3 P3 P3 P3                    ;




                                                                                8
```


## Página 10

```text
CAT (Computer Aided Transceiver) Operation
CS       CW SPOT
         1   2    3   4   5   6   7   8   9     10   P1 0: CW SPOT “OFF”
Set
         C   S   P1   ;                                 1: CW SPOT “ON”
         1   2    3   4   5   6   7   8   9     10
Read
         C   S    ;
         1   2    3   4   5   6   7   8   9     10
Answer
         C   S   P1   ;


CT       SQL TYPE
         1   2    3   4   5   6   7   8   9     10   P1 0: MAIN-side
Set                                                     1: SUB-side
         C   T   P1 P2    ;
                                                     P2 0: CTCSS “OFF”
         1   2    3   4   5   6   7   8   9     10      1: CTCSS ENC “ON” / DEC “OFF”
Read                                                    2: CTCSS ENC “ON” / DEC “ON”
         C   T   P1   ;
                                                        3: DCS “ON”
         1   2    3   4   5   6   7   8   9     10
                                                        4: PR FREQ
Answer
         C   T   P1 P2    ;                             5: REV TONE


DA       DIMMER
         1   2    3   4   5   6   7   8   9     10   11   P1   00: (Fixed)
Set
         D   A   P1 P1 P2 P2 P3 P3 P4 P4              ;   P2   00 - 20: TFT Display Contrast
         1   2    3   4   5   6   7   8   9     10   11   P3   00 - 20: TFT Display Brightness Level
Read                                                      P4   00 - 20: LED Indicators Brightness Level
         D   A    ;
         1   2    3   4   5   6   7   8   9     10   11
Answer
         D   A   P1 P1 P2 P2 P3 P3 P4 P4              ;


DN       MIC DOWN
         1   2    3   4   5   6   7   8   9     10
Set
         D   N    ;
         1   2    3   4   5   6   7   8   9     10
Read
         1   2    3   4   5   6   7   8   9     10
Answer


DT       DATE AND TIME
         1   2    3   4   5   6   7   ~   n-1   n    P1 0: Date
Set
         D   T   P1 P2 P2 P2 P2       ~   P2    ;       1: Time (Local)
         1   2    3   4   5   6   7   8   9     10   P2 P1=0     yyyymmdd (Year/Month/Date)
Read                                                    P1=1     hhmmss (Hour/Minute/Second, 24 hour time system)
         D   T   P1   ;
         1   2    3   4   5   6   7   ~   n-1   n
Answer
         D   T   P1 P2 P2 P2 P2       ~   P2    ;


EO       ENCODER OFFSET
         1   2    3   4   5   6   7   8   9     10   P1 0: MAIN-side               P4 P2=0
Set                                                     1: SUB-side		                     0: Hz
         E   O   P1 P2 P3 P4 P5 P5 P5           ;
                                                        2: MAIN-side and SUB-side		       1: kHz
         1   2    3   4   5   6   7   8   9     10
Read                                                 P2 0: MAIN dial		                    2: MHz
                                                        1: FUNC knob                  P2=1
         1   2    3   4   5   6   7   8   9     10   P3 +: Up                             0: fix
Answer                                                  -: Down                    P5 000 - 999



EX       MENU
         1   2    3   4   5   6   7   8   9     ~    nn   **   P1   : 01 - 07
Set
         E   X   P1 P1 P2 P2 P3 P3 P4           ~    P4    ;   P2   : 01 - 07
         1   2    3   4   5   6   7   8   9     10   nn   **   P3   : 01 - 26
Read                                                           P4   : Parameter (See Table 3)
         E   X   P1 P1 P2 P2 P3 P3         ;
         1   2    3   4   5   6   7   8   9     ~    nn   **
Answer
         E   X   P1 P1 P2 P2 P3 P3 P4           ~    P4    ;




                                                               9
```


## Página 11

```text
CAT (Computer Aided Transceiver) Operation
                                                       Table 3 (MENU Chart)
      P1             P2        P3           Function                                                        P4                                     Digits
                               01   AF TREBLE GAIN            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
                               02   AF MIDDLE TONE GAIN       -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
                               03   AF BASS GAIN              -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
                               04   AGC FAST DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               05   AGC MID DELAY             20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               06   AGC SLOW DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               07   LCUT FREQ                 00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                                         2
                               08   LCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                               1
                               09   HCUT FREQ                 00: OFF 01: 700 Hz - 67: 4000 Hz (50 Hz steps)                                         2
                      01
                  (MODE SSB)   10   HCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                               1
                               11   USB OUT LEVEL             000 - 100                                                                              3
                               12   TX BPF SEL                0: 50 - 3050 1: 100 - 2900 2: 200 - 2800 3: 300 - 2700 4: 400 - 2600 (Hz)              1
                               13   MOD SOURCE                0: MIC 1: USB 2: Bluetooth 3: AUTO                                                     1
                               14   USB MOD GAIN              000 - 100                                                                              3
                               15   RPTT SELECT               0: OFF 1: RTS 2: DTR                                                                   1
                                                              00: 300     01: 400      02: 600    03: 850    04: 1100 05: 1200 06: 1500 07: 1650
                               16   NAR WIDTH                 08: 1800 09: 1950 10: 2100 11: 2250 12: 2400 13: 2450 14: 2500 15: 2600                2
                                                              16: 2700 17: 2800 18: 2900 19: 3000 20: 3200 21: 3500 22: 4000 (Hz)
                               17   CW AUTO MODE              0: OFF 1: 50MHz 2: ON                                                                  1
                               01   AF TREBLE GAIN            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
                               02   AF MIDDLE TONE GAIN       -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
                               03   AF BASS GAIN              -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
                               04   AGC FAST DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               05   AGC MID DELAY             20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               06   AGC SLOW DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               07   LCUT FREQ                 00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                                         2
                     02
                               08   LCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                               1
                  (MODE AM)
                               09   HCUT FREQ                 00: OFF 01: 700 Hz - 67: 4000 Hz (50 Hz steps)                                         2
                               10   HCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                               1
                               11   USB OUT LEVEL             000 - 100                                                                              3
                               12   TX BPF SEL                0: 50 - 3050 1: 100 - 2900 2: 200 - 2800 3: 300 - 2700 4: 400 - 2600                   1
                               13   MOD SOURCE                0: MIC 1: USB 2: Bluetooth 3: AUTO                                                     1
                               14   USB MOD GAIN              000 - 100                                                                              3
                               15   RPTT SELECT               0: OFF 1: RTS 2: DTR                                                                   1
                               01   AF TREBLE GAIN            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
       01                      02   AF MIDDLE TONE GAIN       -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
(RADIO SETTING)
                               03   AF BASS GAIN              -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                                 3
                               04   AGC FAST DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               05   AGC MID DELAY             20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               06   AGC SLOW DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                         4
                               07   LCUT FREQ                 00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                                         2
                               08   LCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                               1
                               09   HCUT FREQ                 00: OFF 01: 700 Hz - 67: 4000 Hz (50 Hz steps)                                         2
                               10   HCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                               1
                               11   USB OUT LEVEL             000 - 100                                                                              3
                               12   MOD SOURCE                0: MIC 1: USB 2: Bluetooth 3: AUTO                                                     1
                               13   USB MOD GAIN              000 - 100                                                                              3
                               14   RPTT SELECT               0: OFF 1: RTS 2: DTR                                                                   1
                               15   RPT SHIFT                 0: - 1: SIMPLEX 2: + 3: ARS                                                            1
                               16   RPT SHIFT(28MHz)          0 - 1000 kHz (P4 = 0000 - 1000, 10 kHz/step)                                           4
                               17   RPT SHIFT(50MHz)          0 - 4000 kHz (P4 = 0000 - 4000, 10 kHz/step)                                           4
                               18   RPT SHIFT(144MHz)         0 - 100MHz (P4 = 0000 - 0100, 50 kHz/step)                                             4
                     03
                               19   RPT SHIFT(430MHz)         0 - 100MHz (P4 = 0000 - 0100, 50 kHz/step)                                             4
                  (MODE FM)
                               20   SQL TYPE                  0: OFF 1: ENC 2: TSQ 3: DCS 4: PR FREQ 5: REV TONE                                     1
                               21   TONE FREQ                 00: 67.0 - 49: 254.1Hz                                                                 2
                               22   DCS CODE                  00: 023 - 103: 754                                                                     2
                               23   DCS RX REVERS             0: NORMAL 1: REVERS 2: BOTH                                                            1
                               24   DCS TX REVERS             0: NORMAL 1: REVERS                                                                    1
                               25   PR FREQ                   300 - 3000 Hz (P4= 0300 - 3000, 100 Hz/step)                                           4
                               26   DTMF DELAY                0: 50 1: 250 2: 450 3: 750 4: 1000 (ms)                                                1
                               27   DTMF SPEED                0: 50 1: 100 (ms)                                                                      1
                               28   DTMF MEMORY1              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               29   DTMF MEMORY2              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               30   DTMF MEMORY3              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               31   DTMF MEMORY4              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               32   DTMF MEMORY5              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               33   DTMF MEMORY6              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               34   DTMF MEMORY7              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               35   DTMF MEMORY8              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               36   DTMF MEMORY9              0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16
                               37   DTMF MEMORY10             0 - 9, A, B, C, D, *, #, - (space) (Up to 16 characters)                              16




                                                                   10
```


## Página 12

```text
CAT (Computer Aided Transceiver) Operation
                                                        Table 3 (MENU Chart)
      P1              P2        P3            Function                                                     P4                                     Digits
                                01   AF TREBLE GAIN            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
                                02   AF MIDDLE TONE GAIN       -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
                                03   AF BASS GAIN              -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
                                04   AGC FAST DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                05   AGC MID DELAY             20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                06   AGC SLOW DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                07   LCUT FREQ                 00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                                       2
                                08   LCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                             1
                                09   HCUT FREQ                 00: OFF 01: 700 Hz - 67: 4000 Hz (50 Hz steps)                                       2
                      04        10   HCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                             1
                  (MODE DATA)   11   USB OUT LEVEL             000 - 100                                                                            3
                                12   TX BPF SEL                0: 50 - 3050 1: 100 - 2900 2: 200 - 2800 3: 300 - 2700 4: 400 - 2600                 1
                                13   MOD SOURCE                0: MIC 1: USB 2: Bluetooth 3: AUTO                                                   1
                                14   USB MOD GAIN              000 - 100                                                                            3
                                15   RPTT SELECT               0: OFF 1: RTS 2: DTR                                                                 1
                                                               00: 50      01:100     02: 150   03: 200     04: 250   05: 300 06: 350  07: 400
                                16   NAR WIDTH                 08: 450     09: 500    10: 600   11: 800     12: 1200 13: 1400 14: 1700 15: 2000     2
                                                               16: 2400 17: 3000 18: 3200 19: 3500 20: 4000 (Hz)
                                17   PSK TONE                  0: 1000Hz 1: 1500Hz 2: 2000Hz                                                        1
                                18   DATA SHIFT (SSB)          0 - 3000 Hz (P4 = 0000 - 3000, 10 Hz steps)                                          4
                                01   AF TREBLE GAIN            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
       01
                                02   AF MIDDLE TONE GAIN       -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
(RADIO SETTING)
                                03   AF BASS GAIN              -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
                                04   AGC FAST DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                05   AGC MID DELAY             20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                06   AGC SLOW DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                07   LCUT FREQ                 00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                                       2
                                08   LCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                             1
                      05        09   HCUT FREQ                 00: OFF 01: 700 Hz - 67: 4000 Hz (50 Hz steps)                                       2
                  (MODE RTTY)   10   HCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                             1
                                11   USB OUT LEVEL             000 - 100                                                                            3
                                12   RPTT SELECT               0: OFF 1: RTS 2: DTR                                                                 1
                                                               00: 50      01:100     02: 150   03: 200     04: 250   05: 300 06: 350  07: 400
                                13   NAR WIDTH                 08: 450     09: 500    10: 600   11: 800     12: 1200 13: 1400 14: 1700 15: 2000     2
                                                               16: 2400 17: 3000 18: 3200 19: 3500 20: 4000 (Hz)
                                14   MARK FREQUENCY            0: 1275 Hz 1: 2125 Hz                                                                1
                                15   SHIFT FREQUENCY           0: 170 Hz 1: 200 Hz 2: 425 Hz 3: 850 Hz                                              1
                                16   POLARITY-TX               0: NOR 1: REV                                                                        1
                                01   DIGITAL POPUP             00: OFF 01: 2 sec - 59: 60sec 60: CONTINUE                                           2
                                02   LOCATION SERVICE          0: OFF 1: ON                                                                         1
                      06
                                03   STANDBY BEEP              0: OFF 1: ON                                                                         1
                   (DIGITAL)
                                04   DP-ID LIST                ꟷ                                                                                    -
                                05   RADIO ID                  ꟷ                                                                                    -
                                01   AF TREBLE GAIN            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
                                02   AF MIDDLE TONE GAIN       -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
                                03   AF BASS GAIN              -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                               3
                                04   AGC FAST DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                05   AGC MID DELAY             20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                06   AGC SLOW DELAY            20 - 4000 msec (P4= 0020 - 4000, 20 msec/step)                                       4
                                07   LCUT FREQ                 00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                                       2
                                08   LCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                             1
                                09   HCUT FREQ                 00: OFF 01: 700 Hz - 67: 4000 Hz (50 Hz steps)                                       2
                     01         10   HCUT SLOPE                0: 6 dB/oct 1: 18 dB/oct                                                             1
                  (MODE CW)     11   USB OUT LEVEL             000 - 100                                                                            3
                                12   RPTT SELECT               0: OFF 1: RTS 2: DTR                                                                 1
                                                               00: 50      01:100     02: 150   03: 200     04: 250   05: 300 06: 350  07: 400
                                13   NAR WIDTH                 08: 450     09: 500    10: 600   11: 800     12: 1200 13: 1400 14: 1700 15: 2000     2
                                                               16: 2400 17: 3000 18: 3200 19: 3500 20: 4000 (Hz)
      02                        14   PC KEYING                 0: OFF 1: RTS 2: DTR                                                                 1
 (CW SETTING)
                                15   CW BK-IN TYPE             0: SEMI 1: FULL                                                                      1
                                16   CW FREQ DISPLAY           0: DIRECT FREQ 1: PITCH OFFSET                                                       1
                                17   QSK DELAY TIME            0: 15 msec 1: 20 msec 2: 25 mesc 3: 30 msec                                          1
                                18   CW INDICATOR              0: OFF 1: ON                                                                         1
                                01   KEYER TYPE                0: OFF 1: BUG 2: ELEKEY-A 3: ELEKEY-B 4: ELEKEY-Y 5: ACS                             1
                                02   KEYER DOT/DASH            0: NOR 1: REV                                                                        1
                                03   CW WEIGHT                 2.5 - 4.5 (P4 = 25 - 45)                                                             2
                                04   NUMBER STYLE              0: 1290 1: AUNO 2: AUNT 3: A2NO 4: A2NT 5: 12NO 6: 12NT                              1
                                05   CONTEST NUMBER            0001 - 9999                                                                          4
                       02
                                06   CW MEMORY 1               0: TEXT 1: MESSAGE                                                                   1
                    (KEYER)
                                07   CW MEMORY 2               0: TEXT 1: MESSAGE                                                                   1
                                08   CW MEMORY 3               0: TEXT 1: MESSAGE                                                                   1
                                09   CW MEMORY 4               0: TEXT 1: MESSAGE                                                                   1
                                10   CW MEMORY 5               0: TEXT 1: MESSAGE                                                                   1
                                11   REPEAT INTERVAL           1 - 60 sec (P4 = 01 - 60)                                                            2




                                                                    11
```


## Página 13

```text
CAT (Computer Aided Transceiver) Operation
                                                               Table 3 (MENU Chart)
        P1                P2         P3           Function                                                       P4                                Digits
                                     01   BEEP LEVEL                  000 - 100                                                                      3
                                     02   RF/SQL VR                   0: RF 1: SQL 2:SQL (FM MODE only)                                              1
                                     03   TUN/LIN PORT SELECT         0: EXT-TUNER 1: LINEAR 2: CAT-3 3: GPO                                         1
                                     04   TUNER SELECT                0: INT 1: INT (FAST) 2: EXT 3: ATAS                                            1
                                     05   CAT-1 RATE                  0: 4800 bps 1: 9600 bps 2: 19200 bps 3: 38400 bps        4:115200 bps          1
                                     06   CAT-1 TIME OUT TIMER        0: 10 msec 1: 100 msec 2: 1000 msec 3: 3000 msec                               1
                                     07   CAT-1 CAT-3 STOP BIT        0: 1 bit 1: 2 bit                                                              1
                                     08   CAT-2 RATE                  0: 4800 bps 1: 9600 bps 2: 19200 bps 3: 38400 bps        4:115200 bps          1
                           01
                                     09   CAT-2 TIME OUT TIMER        0: 10 msec 1: 100 msec 2: 1000 msec 3: 3000 msec                               1
                       (GENERAL)
                                     10   CAT-3 RATE                  0: 4800 bps 1: 9600 bps 2: 19200 bps 3: 38400 bps        4:115200 bps          1
                                     11   CAT-3 TIME OUT TIMER        0: 10 msec 1: 100 msec 2: 1000 msec 3: 3000 msec                               1
                                     12   TX TIME OUT TIMER           00: OFF 01: 01 min - 30: 30 min (P4= 00 - 30)                                  2
                                     13   REF FREQ ADJ                -25 - +00 (or -00) - +25 (P4= -25 - +00 or -00 - +25)                          3
                                     14   CHARGE CONTROL              0: OFF 1: ON                                                                   1
                                     15   SUB BAND MUTE               0: OFF 1: ON                                                                   1
                                     16   SPEAKER SELECT              0: Auto 1: INT 2: BOTH                                                         1
                                     17   DITHER                      0: OFF   1: ON                                                                 1
                                     01   QMB CH                      0: 5ch     1: 10ch                                                             1
                          02         02   BAND STACK                  0: OFF 1: ON                                                                   1
                      (BAND-SCAN)    03   BAND EDGE                   0: OFF 1: ON                                                                   1
                                     04   SCAN RESUME                 0: BUSY 1: HOLD 2: 1sec 3: 3sec 4: 5sec                                        1
                                     01   IF NOTCH WIDTH              0: NARROW 1: WIDE                                                              1
                                     02   NB REJECTION                0: LOW 1: MID 2: HIGH                                                          1
                           03        03   NB WIDTH                    0: NARROW 1: MEDIUM 2: WIDE                                                    1
                        (RX-DSP)     04   APF WIDTH                   0: NARROW 1: MEDIUM 2: WIDE                                                    1
                                     05   CONTOUR LEVEL               -40 - -00 (or +00) - +20 (P4 = -40 - -00 or +00 - +20)                         3
                                     06   CONTOUR WIDTH               01 - 11                                                                        2
                                     01   AMC RELEASE TIME            0: FAST 1: MID 2: SLOW                                                         1
                                     02   PRMTRC EQ1 FREQ             00 : OFF 01: 100 Hz - 07: 700 Hz (100 Hz steps)                                2
                                     03   PRMTRC EQ1 LEVEL            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                         3
                                     04   PRMTRC EQ1 BWTH             00 - 10                                                                        2
                                     05   PRMTRC EQ2 FREQ             00: OFF 01: 700 Hz - 09: 1500 Hz (100 Hz steps)                                2
                                     06   PRMTRC EQ2 LEVEL            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                         3
                                     07   PRMTRC EQ2 BWTH             00 - 10                                                                        2
                                     08   PRMTRC EQ3 FREQ             00 : OFF 01: 1500 Hz - 18: 3200 Hz (100 Hz steps)                              2
                                     09   PRMTRC EQ3 LEVEL            -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                         3
        03                 04
                                     10   PRMTRC EQ3 BWTH             00 - 10                                                                        2
(OPERATION SETTING)    (TX AUDIO)
                                     11   P PRMTRC EQ1 FREQ           00 : OFF 01: 100 Hz - 07: 700 Hz (100 Hz steps)                                2
                                     12   P PRMTRC EQ1 LEVEL          -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                         3
                                     13   P PRMTRC EQ1 BWTH           00 - 10                                                                        2
                                     14   P PRMTRC EQ2 FREQ           00: OFF 01: 700 Hz - 09: 1500 Hz (100 Hz steps)                                2
                                     15   P PRMTRC EQ2 LEVEL          -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                         3
                                     16   P PRMTRC EQ2 BWTH           00 - 10                                                                        2
                                     17   P PRMTRC EQ3 FREQ           00 : OFF 01: 1500 Hz - 18: 3200 Hz (100 Hz steps)                              2
                                     18   P PRMTRC EQ3 LEVEL          -20 - -00 (or +00) - +10 (P4 = -20 - -00 or +00 - +10)                         3
                                     19   P PRMTRC EQ3 BWTH           00 - 10                                                                        2
                                     01   MAX POWER (BAT)             005 - 060 (P4 = 005 - 060)                                                     3
                                     02   QRP MODE                    0: OFF 1: ON                                                                   1
                                     03   HF MAX POWER                005 - 010 (P4 = 005 - 010)                                                     3
                                     04   50M MAX POWER               005 - 010 (P4 = 005 - 010)                                                     3
                                     05   70M MAX POWER               005 - 060 (P4 = 005 - 060)                                                     3
                                     06   144M MAX POWER              005 - 100 (P4 = 005 - 100)                                                     3
                           05
                                     07   430M MAX POWER              005 - 100 (P4 = 005 - 100)                                                     3
                      (TX GENERAL)
                                     08   AM HF/50 MAX POWER          005 - 025 (P4 = 005 - 025)                                                     3
                                     09   AM V/U MAX POWER            005 - 025 (P4 = 005 - 025)                                                     3
                                     10   VOX SELECT                  0: MIC 1: USB 2: Bluetooth                                                     1
                                     11   EMERGENCY FREQ TX           0: OFF 1: ON                                                                   1
                                     12   TX INHIBIT                  0: OFF 1: ON                                                                   1
                                     13   METER DETECTOR              0: AVERAGE 1: PEAK                                                             1
                                     01   SSB/CW DIAL STEP            0: 5 1: 10 2: 20 (Hz)                                                          1
                                     02   RTTY/PSK DIAL STEP          0: 5 1: 10 2: 20 (Hz)                                                          1
                                     03   FM DIAL STEP                0: 5 1: 6.25 2: 10 3: 12.5 4: 20 5: 25 (kHz) 6: Auto                           1
                                     04   CH STEP                     0: 1 1: 2.5 2: 5 3: 10 (kHz)                                                   1
                                     05   AM CH STEP                  0: 2.5 1: 5 2: 9 3: 10 4: 12.5 5: 25 (kHz)                                     1
                                     06   FM CH STEP                  0: 5 1: 6.25 2: 10 3: 12.5 4: 20 5: 25 (kHz)                                   1
                           06        07   MAIN STEPS PER REV.         0: 50 1: 100 2: 200                                                            1
                       (KEY/DIAL)    08   MIC P1
                                     09   MIC P2                      00:LOCK      01:QMB            02:>/<         03:V/M          04:TUNER
                                     10   MIC P3                      05:VOX/MOX   06:MODE           07:ZIN/SPOT    08:SPLIT        09:FINE
                                                                      10:NAR       11:NB             12:DNR         13:FREQ UP      14:FREQ DOWN     2
                                     11   MIC P4                      15:BAND UP   16:BAND DOWN      17 ATT         18:IPO          19:DNF
                                     12   MIC UP                      20:AGC
                                     13   MIC DOWN
                                     14   MIC SCAN                    0: OFF   1: ON                                                                 1




                                                                        12
```


## Página 14

```text
CAT (Computer Aided Transceiver) Operation
                                                                 Table 3 (MENU Chart)
        P1                  P2          P3           Function                                                       P4      Digits
                                        01   TUNER TYPE SEL ANT1        0: INT 1: INT(FAST) 2: EXT 3: ATAS                    1
                                        02   TUNER TYPE SEL ANT2        0: INT 1: INT(FAST) 2: EXT 3: ATAS                    1
                                        03   ANT2 OPERATION             0: TRX 1: TX-ANT1, RX-ANT2 2: TRX-ANT1, RX-ANT2       1
                                        04   HF ANT SELECT              0: ANT1 1: ANT2                                       1
                                        05   HF MAX POWER               005 - 100 (P4 = 005 - 100)                            3
                                        06   50M MAX POWER              005 - 100 (P4 = 005 - 100)                            3
                                        07   70M MAX POWER              005 - 050 (P4 = 005 - 050)                            3
        03                  07
                                        08   144M MAX POWER             005 - 050 (P4 = 005 - 050)                            3
(OPERATION SETTING)      (OPTION)
                                        09   430M MAX POWER             005 - 050 (P4 = 005 - 050)                            3
                                        10   AM MAX POWER               005 - 025 (P4 = 005 - 025)                            3
                                        11   AM V/U MAX POWER           005 - 013 (P4 = 005 - 013)                            3
                                        12   GPS                        0: OFF 1: ON                                          1
                                        13   GPS PINNING                0: OFF 1: ON                                          1
                                        14   GPS BAUDRATE               0: 4800 1: 9600 2: 19200 3: 38400 4: 115200 (bps)     1
                                        15   BLUETOOTH                  ꟷ                                                     -
                                        01   MY CALL                    Up to 10 characters                                  10
                                        02   MY CALL TIME               0: OFF 1: 1 2: 2 3: 3 4: 4 5: 5 (sec)                 1
                                        03   POP-UP TIME                0: FAST 1: MID 2: SLOW                                1
                             01         04   SCREEN SAVER               0: OFF 1: 1 2: 2 3: 5 4: 15 5: 30 6: 60 (min)         1
                         (DISPLAY)      05   SCREEN SAVER(BAT)          0: OFF 1: 1 2: 2 3: 5 4: 15 5: 30 6: 60 (min)         1
                                        06   SAVER TYPE                 0: Logo 1: DIMMER 2: DISP OFF                         1
                                        07   AUTO POWER OFF             0: OFF 1: 0.5 - 24: 12 (hour)                         1
                                        08   LED DIMMER                 00 - 20                                               2
                                        01   POSITION UNIT              0: dd°MM.mm’. 1: dd°mm’ss’’                           1
                                        02   DISTANCE UNIT              0: km 1: mile                                         1
                                        03   SPEED UNIT                 0: km/h 1: knot 3: mph                                1
        04                  02
                                        04   ALTITUDE UNIT              0: m 1: ft                                            1
 (DISPLAY SETTING)        (UNIT)
                                        05   TEMP UNIT                  0: °C 1: °F                                           1
                                        06   RAIN UNIT                  0: mm 1: INCH                                         1
                                        07   WIND UNIT                  0: m/s 2: mph                                         1
                                        01   RBW                        0: HIGH 1: MID 2: LOW                                 1
                                        02   SCOPE CTR                  0: FILTER 1: CARRIER                                  1
                            03
                                        03   2D DISP SENSITIVITY        0: NORMAL 1: HI                                       1
                         (SCOPE)
                                        04   3DSS DISP SENSITIVITY      0: NORMAL 1: HI                                       1
                                        05   AVERAGE                    0: OFF 1: 2 2: 4 3: 8                                 1
                                        01   VMI COLOR VFO              0: BLUE 1: GREEN 2: WHITE 3: NONE                     1
                             04
                                        02   VMI COLOR MEMORY           0: BLUE 1: GREEN 2: WHITE 3: NONE                     1
                      (VFO IND COLOR)
                                        03   VMI COLOR CLAR             0: RED 1: NONE                                        1
                                        01   TIME ZONE                  -12 (-120) - 0 - +14 (+140) (h) (0.5h steps)          4
                                        02   DAY                        ꟷ                                                     -
                                        03   MONTH                      ꟷ                                                     -
                            01          04   YEAR                       ꟷ                                                     -
                       (DATE&TIME)
                                        05   HOUR                       ꟷ                                                     -
                                        06   MINUTE                     ꟷ                                                     -
                                        07   GPS TIME SET               0: AUTO 1: MANUAL                                     1
                                        08   MY POSITION                0: GPS 1: MANUAL                                      1
                            01          09   MY POSITION LATITUDE       Latitude: x xx°xx’ xx”                                -
                       (MY POSITION)
                                        10   MY POSITION LONGITUDE      Longitude: x xxx°xx’ xx”                              -
                                        01   MEM LIST LOAD              ꟷ                                                     -
                                        02   MEM LIST SAVE              ꟷ                                                     -
        05                              03   MENU LOAD                  ꟷ                                                     -
(EXTENSION SETTING)         02          04   MENU SAVE                  ꟷ                                                     -
                        (SD CARD)
                                        05   INFORMATIONS               ꟷ                                                     -
                                        06   FIRMWARE UPDATE            ꟷ                                                     -
                                        07   FORMAT                     ꟷ                                                     -
                            03          01   SOFT VERSION              ꟷ                                                      -
                      (SOFT VERSION)
                             04         01   CALIBRATION               ꟷ                                                      -
                       (CALIBRATION)
                                        01   MEMORY CLEAR              ꟷ                                                      -
                            05          02   MENU CLEAR                ꟷ                                                      -
                         (RESET)
                                        03   ALL RESET                 ꟷ                                                      -
                            05          04   CERTIFICATION             ꟷ                                                      -
                      (CERTIFICATION)




                                                                           13
```


## Página 15

```text
CAT (Computer Aided Transceiver) Operation
                                                            Table 3 (MENU Chart)
     P1                P2         P3          Function                                                     P4                                             Digits
                                  01   MODEM SELECT               0: OFF 1: AUTO 2: MAIN          3: SUB                                                    1
                                  02   MODEM TYPE                 0: 1200bps 1: 9600bps                                                                     1
                                  03   APRS AF MUTE               0: OFF 1: ON                                                                              1
                       01
                   (GENERAL)      04   APRS TX DELAY              0: 100ms    1: 200ms     2: 300ms   3: 400ms    4: 500ms    5: 750ms    6: 1000ms         1

                                  05   CALLSIGN(APRS)             xxxxxx-xx                                                                                 8
                                  09   APRS DESTINATION           APYX01 (fix)                                                                              6
                                  01   MESSAGE TEXT1              Up to 16 characters (ASCII)                                                              16
                                  02   MESSAGE TEXT2              Up to 16 characters (ASCII)                                                              16
                                  03   MESSAGE TEXT3              Up to 16 characters (ASCII)                                                              16
      06               02         04   MESSAGE TEXT4              Up to 16 characters (ASCII)                                                              16
(APRS SETTING)   (MSG TEMPLATE)   05   MESSAGE TEXT5              Up to 16 characters (ASCII)                                                              16
                                  06   MESSAGE TEXT6              Up to 16 characters (ASCII)                                                              16
                                  07   MESSAGE TEXT7              Up to 16 characters (ASCII)                                                              16
                                  08   MESSAGE TEXT8              Up to 16 characters (ASCII)                                                              16
                                  01   MY SYNBOL                  0: ICON1 1: ICON2 2: ICON3          3: USER                                               1
                                  02   ICON1                      See Table 4 (see page 16)                                                                 2
                       03         03   ICON2                      See Table 4 (see page 16)                                                                 2
                  (MY SYMBOL)
                                  04   ICON3                      See Table 4 (see page 16)                                                                 2
                                  05   USER                       See Table 4 (see page 16)                                                                 2
                       04         01   PATH SELECT                0: OFF     1: WIDE1-1    2: WIDE1-1.WIDE2-1                                               1
                   (DIGI PATH)
                                  01   BEACON TYPE                0: OFF 1: AUTO 2: SMART                                                                   1
                                  02   INFO AMBIGUITY             0: OFF 1: 1dig 2: 2dig 3: 3dig 4: 4dig                                                    1
                                  03   INFO SPEED/COURSE          0: OFF 1: ON                                                                              1
                      01          04   INFO ALTITUDE              0: OFF 1: ON                                                                              1
                 (BEACON SET.)                                    00: Off duty    01: En Route 02: In Service 03: Returning 04: Committed
                                  05   POSITION COMMENT           05: Special     06: Priority    07: Custom 0     08: Custom 1 09: Custom 2                2
                                                                  10: Custom 3 11: Custom 4 12: Custom 5           13: Custom 6 14: EMERGENCY!
                                  06   EMERGENCY BEACON           0: OFF 1: ON                                                                              1
                                                                  0:30sec / 1:1min / 2:2min / 3:3min / 4:5min / 5:10min / 6:15min / 7:20min / 8:30min /
                                  01   INTERVAL TIME                                                                                                        1
                                                                  9:60min
                       02         02   PROPORTIONAL               0: OFF 1: ON                                                                              1
                 (AUTO BEACON)    03   DECAY                      0: OFF 1:ON                                                                               1
                                  04   AUTO LOW SPEED             01 - 99 (km/h or mph (1km or 1mph/Step)                                                   2
                                  05   BEACON DELAY               005 - 180 (sec)                                                                           3
      07                          01   SMART LOW SPEED            02 - 30 (km/h or mph (1km or 1mph/Step)                                                   2
(APRS BEACON)                     02   SMART HIGH SPEED           03 - 90 (km/h or mph (1km or 1mph/Step)                                                   2
                                  03   SMART SLOW RATE            001 - 100 (min) (1min/step)                                                               3
                       03         04   SMART FAST RATE            010 - 180 (sec) (1sec/step)                                                               3
                   (SmartBeac.)
                                  05   SMART TURN ANGLE           05 - 90 (degree) (1degree/step)                                                           2
                                  06   SMART TURN SLOPE           001 - 255 (1/step)                                                                        3
                                  07   SMART TURN TIME            005 - 180 (sec) (1sec/step)                                                               3
                                  01   STATUS TEXT SELECT         0: OFF 1: TEXT1 2: TEXT2 3: TEXT3 4: TEXT4 5: TEXT5                                       1
                                  02   TX RATE                    0: 1/1 1: 1/2 2: 1/3 3: 1/4 4: 1/5 5: 1/6 6: 1/7 7: 1/8                                   1
                                  03   BEACON FREQUENCY           0: None 1: FREQUENCY 2: FREQ & SQL & SHIFT                                                1
                      04          04   STATUS TEXT1               Up to 60 characters (ASCII)                                                              60
                 (BEACON TEXT)    05   STATUS TEXT2               Up to 60 characters (ASCII)                                                              60
                                  06   STATUS TEXT3               Up to 60 characters (ASCII)                                                              60
                                  07   STATUS TEXT4               Up to 60 characters (ASCII)                                                              60
                                  08   STATUS TEXT5               Up to 60 characters (ASCII)                                                              60
                        01        01   STATION LIST SORT          0: TIME    1: CALLSIGN     2: DISTANCE                                                    1
                 (LIST SETTING)
                                  01   Mic-E                      0: OFF 1: ON                                                                              1
                                  02   POSITION                   0: OFF 1: ON                                                                              1
                                  03   WEATHER                    0: OFF 1: ON                                                                              1
                       02         04   OBJECT                     0: OFF 1: ON                                                                              1
                 (STATION LIST)   05   ITEM                       0: OFF 1: ON                                                                              1
                                  06   STATUS                     0: OFF 1: ON                                                                              1
                                  07   OTHER                      0: OFF 1: ON                                                                              1
                                  08   ALTNET                     0: OFF 1: ON                                                                              1
                                  01   BEACON                     0: OFF 1: 3sec 2: 5sec        3: 10sec   4: HOLD                                          1
                       03         02   MESSAGE                    0: OFF 1: 3sec 2: 5sec        3: 10sec   4: HOLD                                          1
                    (POPUP)
                                  03   MY PACKET                  0: OFF 1: ON                                                                              1
     08
                                  01   TX BEACON                  0: OFF 1: ON                                                                              1
(APRS FILTER)
                                  02   RX BEACON                  0: OFF 1: ON                                                                              1
                        04        03   TX MESSAGE                 0: OFF 1: ON                                                                              1
                    (RINGER)
                                  04   RX MESSAGE                 0: OFF 1: ON                                                                              1
                                  07   MY PACKET                  0: OFF 1: ON                                                                              1
                                  01   MESSAGE GROUP1             Up to 9 characters (ASCII)                                                                9
                                  02   MESSAGE GROUP2             Up to 9 characters (ASCII)                                                                9
                                  03   MESSAGE GROUP3             Up to 9 characters (ASCII)                                                                9
                                  04   MESSAGE GROUP4             Up to 9 characters (ASCII)                                                                9
                      06          05   MESSAGE GROUP5             Up to 9 characters (ASCII)                                                                9
                   (MSG FIL.)
                                  06   MESSAGE GROUP6             Up to 9 characters (ASCII)                                                                9
                                  07   BULLETIN 1                 Up to 9 characters (ASCII)                                                                9
                                  08   BULLETIN 2                 Up to 9 characters (ASCII)                                                                9
                                  09   BULLETIN 3                 Up to 9 characters (ASCII)                                                                9




                                                                    14
```


## Página 16

```text
CAT (Computer Aided Transceiver) Operation
                                                Table 3 (MENU Chart)
   P1          P2       P3          Function                                                  P4                                Digits
                        01   PRESET NAME              Up to 12 characters                                                        12
                        02   CAT-1 RATE               0: 4800 bps 1: 9600 bps 2: 19200 bps 3: 38400 bps 4:115200 bps              1
                        03   CAT-1 TIME OUT TIMER     0: 10 msec 1: 100 msec 2: 1000 msec 3: 3000 msec                            1
                        04   CAT-1 CAT-3 STOP BIT     0: 1 bit 1: 2 bit                                                           1
                        05   AGC FAST DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        06   AGC MID DELAY            20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        07   AGC SLOW DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
               01       08   LCUT FREQ                00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                              2
            (PRESET1)   09   LCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        10   HCUT FREQ                00: OFF 01:700Hz - 67:4000Hz (50 Hz steps)                                  2
                        11   HCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        12   USB OUT LEVEL            000 - 100                                                                   3
                        13   TX BPF SEL               0: 50 - 3050 1: 100 - 2900 2: 200 - 2800 3: 300 - 2700 4: 400 - 2600 Hz     1
                        14   MOD SOURCE               0: MIC 1: USB 2: REAR (RTTY/DATA Jack) 3: AUTO                              1
                        15   USB MOD GAIN             000 - 100                                                                   3
                        16   RPTT SELECT              0: OFF 1: RTS 2:DTR 3:DAKY (RTTY/DATA Jack)                                 1
                        01   PRESET NAME              Up to 12 characters                                                        12
                        02   CAT-1 RATE               0: 4800 bps 1: 9600 bps 2: 19200 bps 3: 38400 bps 4:115200 bps              1
                        03   CAT-1 TIME OUT TIMER     0: 10 msec 1: 100 msec 2: 1000 msec 3: 3000 msec                            1
                        04   CAT-1 CAT-3 STOP BIT     0: 1 bit 1: 2 bit                                                           1
                        05   AGC FAST DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        06   AGC MID DELAY            20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        07   AGC SLOW DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
               02       08   LCUT FREQ                00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                              2
            (PRESET2)   09   LCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        10   HCUT FREQ                00: OFF 01:700Hz - 67:4000Hz (50 Hz steps)                                  2
                        11   HCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        12   USB OUT LEVEL            000 - 100                                                                   3
                        13   TX BPF SEL               0: 50 - 3050 1: 100 - 2900 2: 200 - 2800 3: 300 - 2700 4: 400 - 2600 Hz     1
                        14   MOD SOURCE               0: MIC 1: USB 2: REAR (RTTY/DATA Jack) 3: AUTO                              1
                        15   USB MOD GAIN             000 - 100                                                                   3
                        16   RPTT SELECT              0: OFF 1: RTS 2:DTR 3:DAKY (RTTY/DATA Jack)                                 1
                        01   PRESET NAME              Up to 12 characters                                                        12
                        02   CAT-1 RATE               0: 4800 bps 1: 9600 bps 2: 19200 bps 3: 38400 bps 4:115200 bps              1
                        03   CAT-1 TIME OUT TIMER     0: 10 msec 1: 100 msec 2: 1000 msec 3: 3000 msec                            1
                        04   CAT-1 CAT-3 STOP BIT     0: 1 bit 1: 2 bit                                                           1
                        05   AGC FAST DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        06   AGC MID DELAY            20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        07   AGC SLOW DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
    09         03       08   LCUT FREQ                00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                              2
 (PRESET)   (PRESET3)   09   LCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        10   HCUT FREQ                00: OFF 01:700Hz - 67:4000Hz (50 Hz steps)                                  2
                        11   HCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        12   USB OUT LEVEL            000 - 100                                                                   3
                        13   TX BPF SEL               0: 50 - 3050 1: 100 - 2900 2: 200 - 2800 3: 300 - 2700 4: 400 - 2600 Hz     1
                        14   MOD SOURCE               0: MIC 1: USB 2: REAR (RTTY/DATA Jack) 3: AUTO                              1
                        15   USB MOD GAIN             000 - 100                                                                   3
                        16   RPTT SELECT              0: OFF 1: RTS 2:DTR 3:DAKY (RTTY/DATA Jack)                                 1
                        01   PRESET NAME              Up to 12 characters                                                        12
                        02   CAT-1 RATE               0: 4800 bps 1: 9600 bps 2: 19200 bps 3: 38400 bps 4:115200 bps              1
                        03   CAT-1 TIME OUT TIMER     0: 10 msec 1: 100 msec 2: 1000 msec 3: 3000 msec                            1
                        04   CAT-1 CAT-3 STOP BIT     0: 1 bit 1: 2 bit                                                           1
                        05   AGC FAST DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        06   AGC MID DELAY            20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        07   AGC SLOW DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
               04       08   LCUT FREQ                00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                              2
            (PRESET4)   09   LCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        10   HCUT FREQ                00: OFF 01:700Hz - 67:4000Hz (50 Hz steps)                                  2
                        11   HCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        12   USB OUT LEVEL            000 - 100                                                                   3
                        13   TX BPF SEL               0: 50 - 3050 1: 100 - 2900 2: 200 - 2800 3: 300 - 2700 4: 400 - 2600 Hz     1
                        14   MOD SOURCE               0: MIC 1: USB 2: REAR (RTTY/DATA Jack) 3: AUTO                              1
                        15   USB MOD GAIN             000 - 100                                                                   3
                        16   RPTT SELECT              0: OFF 1: RTS 2:DTR 3:DAKY (RTTY/DATA Jack)                                 1
                        01   PRESET NAME              Up to 12 characters                                                        12
                        02   CAT-1 RATE               0: 4800 bps 1: 9600 bps 2: 19200 bps 3: 38400 bps 4:115200 bps              1
                        03   CAT-1 TIME OUT TIMER     0: 10 msec 1: 100 msec 2: 1000 msec 3: 3000 msec                            1
                        04   CAT-1 CAT-3 STOP BIT     0: 1 bit 1: 2 bit                                                           1
                        05   AGC FAST DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        06   AGC MID DELAY            20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
                        07   AGC SLOW DELAY           20 - 4000 (P4 = 0020 - 4000, 20 msec steps)                                 4
               05       08   LCUT FREQ                00: OFF 01: 100 Hz - 19: 1000 Hz (50 Hz steps)                              2
            (PRESET5)   09   LCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        10   HCUT FREQ                00: OFF 01:700Hz - 67:4000Hz (50 Hz steps)                                  2
                        11   HCUT SLOPE               0: 6dB/oct 1: 18dB/oct                                                      1
                        12   USB OUT LEVEL            000 - 100                                                                   3
                        13   TX BPF SEL               0: 50 - 3050 1: 100 - 2900 2: 200 - 2800 3: 300 - 2700 4: 400 - 2600 Hz     1
                        14   MOD SOURCE               0: MIC 1: USB 2: REAR (RTTY/DATA Jack) 3: AUTO                              1
                        15   USB MOD GAIN             000 - 100                                                                   3
                        16   RPTT SELECT              0: OFF 1: RTS 2:DTR 3:DAKY (RTTY/DATA Jack)                                 1



                                                        15
```


## Página 17

```text
CAT (Computer Aided Transceiver) Operation
                                                                                  Table 3 (MENU Chart)
         P1                      P2             P3                 Function                                                   P4                                      Digits
                                                01       Bluetooth                         0: OFF 1: ON                                                                 1
          11                    01              02       Device Name : Status              ꟷ                                                                            1
     (BLUETOOTH)            (Bluetooth)         03       DEVICE LIST                       ꟷ                                                                            -
                                                04       AUDIO                             0: AUTO 1: FIX                                                               1



                                                                            Table 4 (MY SYMBOL Chart)
P4          ICON            P4              ICON                 P4             ICON           P4         ICON          P4               ICON         P4        ICON
/0          Circle          /_        Weather Station             /j             Jeep          /u          Bus           \.           Ambiguous       \u   Overlayed Truck
/'      Small Aircraft      /<          Motorcycle               /K            School          /V          ATV           \;        Park/Picnic Area   \v    Overlayed Van
/-    House QTH (VHF)       /=        Railroad Engine            /k            School          /v          ATV          \^              Aircraft      \W      NWS Site
/#           DIGI           />               Car                 /m        Mic-E Repeater      /W       NWS Site        \_             WX Site        \x     Obstruction
/&      HF Gateway          /a          Ambulance                /O            Balloon         /X       Helicopter      \=              APRStt        \Y   Radios & Devices
/.            X             /b            Bycycle                /P             Police         /Y     Yacht(sailboat)   \>          Overlayed Car     E0      EchoLink
/:           Fire           /C             Canoe                 /R         REC.Vehicle        /y     Yacht(sailboat)   \A              APRStt        I0         IRLP
/;      Campground          /E             Eyeball               /r         REC.Vehicle        \0         Circle        \K           Kenwood HT       KY   Kenwood Radios
/[     Human/Person         /f          Fire Truck               /s        Ship(powerboat)      \-     House (HF)       \m          Value Signpost    W0       WIRES
/\      Triangle(DF)        /g             Glider                /T             SSTV           \#      Overlay DIGI     \n         Overlay Triangle   YY    Yaesu Radios
/^      Large Aircraft      /I             TCP/IP                /U              Bus           \&      Overlay Gate     \s         Overlayed Ship     ꟷ           ꟷ



FA            FREQUENCY VFO MAIN-SIDE
              1    2   3       4       5    6        7       8         9    10   11   12     P1 000030000 - 470000000 (Hz)
Set
              F    A   P1 P1 P1 P1 P1 P1 P1 P1 P1                                      ;
              1    2   3       4       5    6        7       8         9    10   11   12
Read
              F    A   ;
              1    2   3       4       5    6        7       8         9    10   11   12
Answer
              F    A   P1 P1 P1 P1 P1 P1 P1 P1 P1                                      ;


FB            FREQUENCY VFO SUB-SIDE
              1    2   3       4       5    6        7       8         9    10   11   12     P1 000030000 - 470000000 (Hz)
Set
              F    B   P1 P1 P1 P1 P1 P1 P1 P1 P1                                      ;
              1    2   3       4       5    6        7       8         9    10   11   12
Read
              F    B   ;
              1    2   3       4       5    6        7       8         9    10   11   12
Answer
              F    B   P1 P1 P1 P1 P1 P1 P1 P1 P1                                      ;


FN            FINE TUNING
              1    2   3       4       5    6        7       8         9    10   P1 0: “OFF”
Set
              F    N   P1      ;                                                    1: Fine Tuning “ON”
              1    2   3       4       5    6        7       8         9    10      2: Fast Tuning “ON”
Read
              F    N   ;
              1    2   3       4       5    6        7       8         9    10
Answer
              F    N   P1      ;


FR            FUNCTION RX
              1    2   3       4       5    6        7       8         9    10   P1 00: Dual receive
Set
              F    R   P1 P1           ;                                            01: Single receive
              1    2   3       4       5    6        7       8         9    10
Read
              F    R   ;
              1    2   3       4       5    6        7       8         9    10
Answer
              F    R   P1 P1           ;


FT            FUNCTION TX
              1    2   3       4       5    6        7       8         9    10   P1 0: MAIN-side Transmitter
Set
              F    T   P1      ;                                                    1: SUB-side Transmitter
              1    2   3       4       5    6        7       8         9    10
Read
              F    T   ;
              1    2   3       4       5    6        7       8         9    10
Answer
              F    T   P1      ;




                                                                                            16
```


## Página 18

```text
CAT (Computer Aided Transceiver) Operation
GP       GP OUT
         1    2     3    4    5    6    7    8     9    10   P1 0: GP OUT A “LOW”
Set                                                              1: GP OUT A “HIGH”                            +13.8V           GND
         G    P    P1 P2 P3 P4          ;                    P2 0: GP OUT B “LOW”
                                                                 1: GP OUT B “HIGH”                        GP OUT A                GP OUT D
         1    2     3    4    5    6    7    8     9    10   P3 0: GP OUT C “LOW”
Read                                                             1: GP OUT C “HIGH”
         G    P     ;                                        P4 0: GP OUT D “LOW”
                                                                 1: GP OUT D “HIGH”                            GP OUT B      GP OUT C
         1    2     3    4    5    6    7    8     9    10   *5V CMOS Level, Max. 3 mA

Answer                                                       Set to “GPO” in the setting menu [OPERATION SETTING] → [GENERAL] →
         G    P    P1 P2 P3 P4          ;                    → [TUN/LIN PORT SELECT].
                                                             (Factory setting: “OPTION”)


GT       AGC FUNCTION
         1    2     3    4    5    6    7    8     9    10   P1 0: MAIN-side   P3 0: AGC “OFF”
Set                                                             1: SUB-side		     1: AGC “FAST”
         G    T    P1 P2      ;
                                                             P2 0: AGC “OFF”		    2: AGC “MID”
         1    2     3    4    5    6    7    8     9    10      1: AGC “FAST”		   3: AGC “SLOW”
Read
         G    T    P1    ;                                      2: AGC “MID”		    4: AGC “AUTO - FAST”
                                                                3: AGC “SLOW”		   5: AGC “AUTO - MID”
         1    2     3    4    5    6    7    8     9    10
Answer                                                          4: AGC “AUTO”		   6: AGC “AUTO - SLOW”
         G    T    P1 P3      ;


ID       IDENTIFICATION
         1    2     3    4    5    6    7    8     9    10   P1 0840 (Fixed)
Set
         1    2     3    4    5    6    7    8     9    10
Read
         I    D     ;
         1    2     3    4    5    6    7    8     9    10
Answer
         I    D    P1 P1 P1 P1          ;


IF       INFORMATION VFO MAIN-SIDE
         1    2     3    4    5    6    7    8     9     P1 00000: VFO or MT or QMB (5 Bytes)
                                                        10
Set                                                         00001 - 00999: (Memory Channel)
                                                            P-01L - P-50U: (PMS)
                                                            50001 - 50020: (5MHz BAND)
         1    2     3    4    5    6    7    8      9 10    EMGCH: (EMERGENCY CH)
Read                                                     P2 VFO Frequency (Hz) (9 Bytes)
         I    F     ;                                    P3 Clarifier Direction +: Plus Shift, -: Minus Shift (1 Bytes)
                                                            Clarifier Offset: 0000 - 9990 (Hz) (4 Bytes)
         1    2     3    4    5    6    7    8      9 10 P4 0: RX CLAR “OFF”         1: RX CLAR “ON”
                                                         P5 0: TX CLAR “OFF”         1: TX CLAR “ON”
         I    F    P1 P1 P1 P1 P1 P2              P2 P2 P6

                                                            MODE 0:-
                                                                      5: AM
                                                                                       1: LSB
                                                                                       6: RTTY-L
                                                                                                        2: USB
                                                                                                        7: CW-L
                                                                                                                        3: CW-U
                                                                                                                        8: DATA-L
                                                                                                                                    4: FM
                                                                                                                                    9: RTTY-U
                                                         		           A: DATA-FM       B: FM-N          C: DATA-U       D: AM-N     E: PSK
         11   12    13   14   15   16   17   18    19 20
                                                         		           F: DATA-FM-N G: -                 H: C4FM-DN I: C4FM-VW J: -
Answer                                                   P7 0: VFO 1: Memory Channel 2: Memory Tune                  3: Quick Memory Bank (QMB)
         P2 P2 P2 P2 P2 P2 P3 P3                  P3 P3     4: -        5: PMS
                                                         P8 0: OFF 1: CTCSS ENC/DEC 2: CTCSS ENC 3: DCS 4: PR FREQ
         21   22    23   24   25   26   27   28    29 30                 5: REV TONE
                                                         P9 00: (Fixed)
         P3 P4 P5 P6 P7 P8 P9 P9                  P10 ; P10 0: Simplex 1: Plus Shift 2: Minus Shift


IS       IF-SHIFT
         1    2     3    4    5    6    7    8     9    10   P1 0: MAIN-side
Set
         I    S    P1 P2 P3 P4 P4 P4 P4                 ;       1: SUB-side
         1    2     3    4    5    6    7    8     9    10   P2 0: (Fixed)
Read                                                         P3 + / -
         I    S    P1    ;
                                                             P4 0000 - 1200 Hz (20 Hz steps)
         1    2     3    4    5    6    7    8     9    10
Answer
         I    S    P1 P2 P3 P4 P4 P4 P4                 ;


KM       KEYING MEMORY
         1    2     3    4    5    6    7    ~    n-1   n    P1 1 - 5 : Keyer Memory Channel Number
Set
         K    M    P1 P2 P2 P2 P2            ~    P2    ;    P2 Message Characters (up to 50 characters)
         1    2     3    4    5    6    7    8     9    10
Read
         K    M    P1    ;
         1    2     3    4    5    6    7    ~    n-1   n
Answer
         K    M    P1 P2 P2 P2 P2            ~    P2    ;




                                                                      17
```


## Página 19

```text
CAT (Computer Aided Transceiver) Operation
KP       KEY PITCH FREQUENCY
         1   2   3    4   5   6   7   8   9   10   P1 00: 300 Hz - 75: 1050 Hz (10Hz steps)
Set
         K   P   P1 P1    ;
         1   2   3    4   5   6   7   8   9   10
Read
         K   P   ;
         1   2   3    4   5   6   7   8   9   10
Answer
         K   P   P1 P1    ;


KR       KEYER
         1   2   3    4   5   6   7   8   9   10   P1 0: CW KEYER “OFF”
Set
         K   R   P1   ;                               1: CW KEYER “ON”
         1   2   3    4   5   6   7   8   9   10
Read
         K   R   ;
         1   2   3    4   5   6   7   8   9   10
Answer
         K   R   P1   ;


KS       KEYER SPEED
         1   2   3    4   5   6   7   8   9   10   P1 004 - 060 (WPM)
Set
         K   S   P1 P1 P1     ;
         1   2   3    4   5   6   7   8   9   10
Read
         K   S   ;
         1   2   3    4   5   6   7   8   9   10
Answer
         K   S   P1 P1 P1     ;


KY       CW KEYING MEMORY PLAY
         1   2   3    4   5   6   7   8   9   10   P1 0: CW TEXT Memory 1: CW MESSAGE Memory
Set                                                P2 0: STOP
         K   Y   P1 P2    ;
                                                      1: CW TEXT/MESSAGE Memory “1” Playback
         1   2   3    4   5   6   7   8   9   10
Read                                                  2: CW TEXT/MESSAGE Memory “2” Playback
                                                      3: CW TEXT/MESSAGE Memory “3” Playback
         1   2   3    4   5   6   7   8   9   10      4: CW TEXT/MESSAGE Memory “4” Playback
Answer                                                5: CW TEXT/MESSAGE Memory “5” Playback



LK       LOCK
         1   2   3    4   5   6   7   8   9   10   P1 0: Lock “OFF”
Set
         L   K   P1   ;                               1: Lock “ON”
         1   2   3    4   5   6   7   8   9   10
Read
         L   K   ;
         1   2   3    4   5   6   7   8   9   10
Answer
         L   K   P1   ;


LM       LOAD MESSAGE
         1   2   3    4   5   6   7   8   9   10   P1 0: MESSAGE (DVS) 1: RECORD
Set                                                P2 P1=0 (MESSAGE)
         L   M   P1 P2    ;                               0: Play Stop/ Recording Stop
                                                          1: Select CH “1”
         1   2   3    4   5   6   7   8   9   10          2: Select CH “2”
Read                                                      3: Select CH “3”
         L   M   P1   ;                                   4: Select CH “4”
                                                          5: Select CH “5”
         1   2   3    4   5   6   7   8   9   10      P1=1 (RECORD)
Answer                                                    0: Recording Stop
         L   M   P1 P2    ;                               1: Recording Start



MA       MEMORY CHANNEL to VFO MAIN-SIDE
         1   2   3    4   5   6   7   8   9   10
Set
         M   A   ;
         1   2   3    4   5   6   7   8   9   10
Read
         1   2   3    4   5   6   7   8   9   10
Answer




                                                            18
```


## Página 20

```text
CAT (Computer Aided Transceiver) Operation
MB       MEMORY CHANNEL to VFO SUB-SIDE
         1    2    3    4    5    6    7    8     9    10
Set
         M    B    ;
         1    2    3    4    5    6    7    8     9    10
Read
         1    2    3    4    5    6    7    8     9    10
Answer


MC       MEMORY CHANNEL
         1    2    3    4    5    6    7    8     9    10   P1 0: MAIN-side
Set
         M    C    P1 P2 P2 P2 P2 P2              ;            1: SUB-side
         1    2    3    4    5    6    7    8     9    10   P2 00001 - 00099: (Memory Channel)
Read                                                           P-01L - P-50U: (PMS)
         M    C    ;                                           50000 - 50020: (5MHz BAND)
         1    2    3    4    5    6    7    8     9    10      EMGCH: (EMERGENCY CH)
Answer
         M    C    P1 P2 P2 P2 P2 P2              ;


MD       OPERATING MODE
         1    2    3    4    5    6    7    8     9    10   P1 0: MAIN-side
Set
         M    D    P1 P2     ;                                 1: SUB-side
         1    2    3    4    5    6    7    8     9    10   P2 MODE 0:-                1: LSB        2: USB        3: CW-U       4: FM
Read                                                        		        5: AM            6: RTTY-L     7: CW-L       8: DATA-L     9: RTTY-U
         M    D    P1   ;                                   		        A: DATA-FM       B: FM-N       C: DATA-U     D: AM-N       E: PSK
         1    2    3    4    5    6    7    8     9    10   		        F: DATA-FM-N     G: -          H: C4FM-DN    I: C4FM-VW    J: -
Answer
         M    D    P1 P2     ;


MG       MIC GAIN
         1    2    3    4    5    6    7    8     9    10   P1 000 - 100
Set
         M    G    P1 P1 P1       ;
         1    2    3    4    5    6    7    8     9    10
Read
         M    G    ;
         1    2    3    4    5    6    7    8     9    10
Answer
         M    G    P1 P1 P1       ;


ML       MONITOR LEVEL
         1    2    3    4    5    6    7    8     9    10   P1 0: MONI “ON/OFF”
Set                                                            1: MONI Level
         M    L    P1 P2 P2 P2         ;
                                                            P2 P1=0
         1    2    3    4    5    6    7    8     9    10
Read                                                              000: MONI “OFF”
         M    L    P1   ;                                         001: MONI “ON”
         1    2    3    4    5    6    7    8     9    10      P1=1
Answer                                                            000 - 100
         M    L    P1 P2 P2 P2         ;


MR       MEMORY CHANNEL READ
                                                        P0 00000: VFO or MT or QMB (5 Bytes)
         1    2    3    4    5    6    7    8     9    10
                                                           00001 - 00999: (Memory Channel)
Set                                                        P-01L - P-50U: (PMS)
                                                           50001 - 50020: (5MHz BAND)
                                                           EMGCH: (EMERGENCY CH)
         1    2    3    4    5    6    7    8      9 10
                                                        P1 00000: VFO or MT or QMB (5 Bytes)
                                                           00001 - 00999: (Memory Channel)
Read                                                       P-01L - P-50U: (PMS)
         M    R    P0 P0 P0 P0 P0           ;              50001 - 50020: (5MHz BAND)
                                                           EMGCH: (EMERGENCY CH)
         1    2    3    4    5    6    7    8      9 10 P2 VFO Frequency (Hz) (9 Bytes)
                                                        P3 Clarifier Direction +: Plus Shift, -: Minus Shift (1 Bytes)
                                                           Clarifier Offset: 0000 - 9990 (Hz) (4 Bytes)
         M    R    P1 P1 P1 P1 P1 P2             P2 P2 P4 0: RX CLAR “OFF”          1: RX CLAR “ON”
                                                        P5 0: TX CLAR “OFF”         1: TX CLAR “ON”
                                                        P6 MODE 0:-                   1: LSB           2: USB          3: CW-U     4: FM
         11   12   13   14   15   16   17   18    19 20 		           5: AM            6: RTTY-L        7: CW-L         8: DATA-L   9: RTTY-U
Answer                                                  		           A: DATA-FM       B: FM-N          C: DATA-U       D: AM-N     E: PSK
         P2 P2 P2 P2 P2 P2 P3 P3                 P3 P3 		            F: DATA-FM-N G: -                 H: C4FM-DN I: C4FM-VW J: -
                                                        P7 0: VFO 1: Memory Channel 2: Memory Tune                  3: Quick Memory Bank (QMB)
                                                           4: -        5: PMS
         21   22   23   24   25   26   27   28    29 30 P8 0: OFF      1: CTCSS ENC/DEC 2: CTCSS ENC 3: DCS 4: PR FREQ
                                                                        5: REV TONE
                                                        P9 00: (Fixed)
         P3 P4 P5 P6 P7 P8 P9 P9                 P10 ; P10 0: Simplex 1: Plus Shift 2: Minus Shift




                                                                     19
```


## Página 21

```text
CAT (Computer Aided Transceiver) Operation
MS       METER SW
         1    2    3    4    5    6    7    8     9    10   P1 MAIN-side
Set                                                            0: PO 1: COMP       2: ALC   3: VDD    4: ID   5: SWR
         M    S    P1 P2     ;
                                                            P2 SUB-side
         1    2    3    4    5    6    7    8     9    10
Read                                                           0: PO 1: COMP       2: ALC   3: VDD    4: ID   5: SWR
         M    S    ;
         1    2    3    4    5    6    7    8     9    10
Answer
         M    S    P1 P2     ;


MT       MEMORY CHANNEL TAG WRITE
         1    2    3    4    5    6    7    8     9    10   P0 00001 - 00099: (Memory Channel)
         M    T    P0 P0 P0 P0 P0 P1 P1 P1                     P-01L - P-50U: (PMS)
Set                                                            50001 - 50009: (5MHz BAND)
         11   12   13   14   15   16   17   18    19   20
                                                               EMGCH: (EMERGENCY CH)
         P1 P1 P1 P1 P1 P1 P1 P1 P1                    ;    P1 TAG Characters (up to 12 characters) (ASCII)
         1    2    3    4    5    6    7    8     9    10
Read
         M    T    P0 P0 P0 P0 P0           ;
         1    2    3    4    5    6    7    8     9    10
         M    T    P0 P0 P0 P0 P0 P1 P1 P1
Answer
         11   12   13   14   15   16   17   18    19   20
         P1 P1 P1 P1 P1 P1 P1 P1 P1                    ;


MW       MEMORY CHANNEL WRITE
         1    2    3    4    5    6    7    8     9     P1 00000: -
                                                       10
                                                            00001 - 00999: (Memory Channel)
         M    W    P1 P1 P1 P1 P1 P2             P2 P2      P-01L - P-50U: (PMS)
                                                        P2 VFO Frequency (Hz) (9 Bytes)
         11   12   13   14   15   16   17   18    19 20 P3 Clarifier Direction +: Plus Shift, -: Minus Shift (1 Bytes)
Set                                                         Clarifier Offset: 0000 - 9990 (Hz) (4 Bytes)
         P2 P2 P2 P2 P2 P2 P3 P3                 P3 P3 P4 0: RX CLAR “OFF”           1: RX CLAR “ON”
                                                        P5 0: TX CLAR “OFF”          1: TX CLAR “ON”
         21   22   23   24   25   26   27   28    29 30
                                                        P6 MODE 0:-                    1: LSB          2: USB          3: CW-U     4: FM
         P3 P4 P5 P6 P7 P8 P9 P9                 P10 ; 		             5: AM            6: RTTY-L       7: CW-L         8: DATA-L   9: RTTY-U
                                                        		            A: DATA-FM       B: FM-N         C: DATA-U       D: AM-N     E: PSK
         1    2    3    4    5    6    7    8      9 10 		            F: DATA-FM-N G: -                H: C4FM-DN I: C4FM-VW J: -
Read                                                    P7 0: VFO 1: Memory Channel 2: Memory Tune                  3: Quick Memory Bank (QMB)
                                                            4: -        5: PMS
                                                        P8 0: OFF 1: CTCSS ENC/DEC 2: CTCSS ENC 3: DCS 4: PR FREQ
         1    2    3    4    5    6    7    8      9 10                  5: REV TONE
Answer                                                  P9 00: (Fixed)
                                                        P10 0: Simplex 1: Plus Shift 2: Minus Shift



MX       MOX
         1    2    3    4    5    6    7    8     9    10   P1 0: MOX “OFF”
Set
         M    X    P1   ;                                      1: MOX “ON”
         1    2    3    4    5    6    7    8     9    10
Read
         M    X    ;
         1    2    3    4    5    6    7    8     9    10
Answer
         M    X    P1   ;


MZ       SPLIT MEMORY
         1    2    3    4    5    6    7    8     9    10   P1 00000: VFO, MT, QMB mode
         M    Z    P1 P1 P1 P1 P1 P2 P3 P3                     00001 - 00999: Memory channel
Set                                                            P-01L - P-50U: PMS channel (P-01L, P-01U, P-02L, P-02U ------ P-50L, P50U)
         11   12   13   14   15   16   17   18    19   20
                                                            P2 0: SPLIT memory “OFF”
         P3 P3 P3 P3 P3 P3 P3               ;
                                                               1: SPLIT memory “ON”
         1    2    3    4    5    6    7    8     9    10
Read                                                        P3 000030000 - 470000000 Hz
         M    Z    P1 P1 P1 P1 P1           ;
         1    2    3    4    5    6    7    8     9    10
         M    Z    P1 P1 P1 P1 P1 P2 P3 P3
Answer
         11   12   13   14   15   16   17   18    19   20
         P3 P3 P3 P3 P3 P3 P3               ;


NA       NARROW
         1    2    3    4    5    6    7    8     9    10   P1 0: MAIN-side
Set
         N    A    P1 P2     ;                                 1: SUB-side
         1    2    3    4    5    6    7    8     9    10   P2 0: NARROW “OFF”
Read                                                           1: NARROW “ON”
         N    A    P1   ;
         1    2    3    4    5    6    7    8     9    10
Answer
         N    A    P1 P2     ;




                                                                     20
```


## Página 22

```text
CAT (Computer Aided Transceiver) Operation
NL       NOISE BLANKER LEVEL
         1    2    3    4    5    6    7    8     9    10   P1 0: MAIN-side
Set
         N    L    P1 P2 P2 P2         ;                       1: SUB-side
         1    2    3    4    5    6    7    8     9    10   P2 000: OFF
Read                                                           001 - 010: (NB Level)
         N    L    P1   ;
         1    2    3    4    5    6    7    8     9    10
Answer
         N    L    P1 P2 P2 P2         ;


OI       OPPOSITE BAND INFORMATION (SUB-SIDE)
         1    2    3    4    5    6    7    8     9     P1 00000: VFO or MT or QMB (5 Bytes)
                                                       10
Set                                                        00001 - 00999: (Memory Channel)
                                                           P-01L - P-50U: (PMS)
                                                           50001 - 50020: (5MHz BAND)
         1    2    3    4    5    6    7    8      9 10    EMGCH: (EMERGENCY CH)
Read                                                    P2 VFO Frequency (Hz) (9 Bytes)
         O    I    ;                                    P3 Clarifier Direction +: Plus Shift, -: Minus Shift (1 Bytes)
                                                           Clarifier Offset: 0000 - 9990 (Hz) (4 Bytes)
         1    2    3    4    5    6    7    8      9 10 P4 0: RX CLAR “OFF”         1: RX CLAR “ON”
                                                        P5 0: TX CLAR “OFF”         1: TX CLAR “ON”
         O    I    P1 P1 P1 P1 P1 P2             P2 P2 P6

                                                           MODE 0:-
                                                                     5: AM
                                                                                      1: LSB
                                                                                      6: RTTY-L
                                                                                                       2: USB
                                                                                                       7: CW-L
                                                                                                                       3: CW-U
                                                                                                                       8: DATA-L
                                                                                                                                   4: FM
                                                                                                                                   9: RTTY-U
                                                        		           A: DATA-FM       B: FM-N          C: DATA-U       D: AM-N     E: PSK
         11   12   13   14   15   16   17   18    19 20
                                                        		           F: DATA-FM-N G: -                 H: C4FM-DN I: C4FM-VW J: -
Answer                                                  P7 0: VFO 1: Memory Channel 2: Memory Tune                  3: Quick Memory Bank (QMB)
         P2 P2 P2 P2 P2 P2 P3 P3                 P3 P3     4: -        5: PMS
                                                        P8 0: OFF 1: CTCSS ENC/DEC 2: CTCSS ENC 3: DCS 4: PR FREQ
         21   22   23   24   25   26   27   28    29 30                 5: REV TONE
                                                        P9 00: (Fixed)
         P3 P4 P5 P6 P7 P8 P9 P9                 P10 ; P10 0: Simplex 1: Plus Shift 2: Minus Shift


OS       OFFSET (REPEATER SHIFT)
         1    2    3    4    5    6    7    8     9    10   P1 0: MAIN-side
Set                                                              1: SUB-side
         O    S    P1 P2     ;
                                                            P2 0: Simplex
         1    2    3    4    5    6    7    8     9    10
Read                                                             1: Plus Shift (+ Offset)
         O    S    P1   ;                                        2: Minus Shift (- Offset)
         1    2    3    4    5    6    7    8     9    10        3: ARS (Automatic Repeater Shift)
Answer                                                      *: This command can be activated only with an FM mode.
         O    S    P1 P2     ;


PA       PRE-AMP (IPO)
         1    2    3    4    5    6    7    8     9    10   P1 0: HF/50MHz band
Set                                                            1: VHF band
         P    A    P1 P2     ;                                 2: UHF band
                                                            P2 P1=0 0: IPO (HF/50)
         1    2    3    4    5    6    7    8     9    10   		        1: AMP1 (HF/50)
Read                                                        		        2: AMP2 (HF/50)
         P    A    P1   ;                                      P1=1 0: VHF Pre AMP “OFF”
         1    2    3    4    5    6    7    8     9    10   		        1: VHF Pre AMP “ON”
Answer                                                         P1=2 0: UHF Pre AMP “OFF”
         P    A    P1 P2     ;                              		        1: UHF Pre AMP “ON”



PB       PLAY BACK
         1    2    3    4    5    6    7    8     9    10   P1 0: (Fixed)
Set                                                         P2 0: MESSAGE Playback / Recording Stop
         P    B    P1 P2     ;                                 1: MESSAGE CH “1” Playback Start
                                                               2: MESSAGE CH “2” Playback Start
         1    2    3    4    5    6    7    8     9    10      3: MESSAGE CH “3” Playback Start
Read                                                           4: MESSAGE CH “4” Playback Start
         P    B    P1   ;                                      5: MESSAGE CH “5” Playback Start
         1    2    3    4    5    6    7    8     9    10
Answer
         P    B    P1 P2     ;


PC       POWER CONTROL
         1    2    3    4    5    6    7    8     9    10   P1 1: FTX-1 field head
Set
         P    C    P1 P2 P2 P2         ;                       2: SPA-1
         1    2    3    4    5    6    7    8     9    10   P2 P1=1: 005 - 010 (W)
Read                                                           P1=2: 005 - 100 (W)
         P    C    ;
         1    2    3    4    5    6    7    8     9    10
Answer
         P    C    P1 P2 P2 P2         ;




                                                                     21
```


## Página 23

```text
CAT (Computer Aided Transceiver) Operation
PL       SPEECH PROCESSOR LEVEL
         1   2     3   4   5   6   7   8   9   10   P1 000: “OFF”, 001 -100
Set
         P   L   P1 P1 P1      ;
         1   2     3   4   5   6   7   8   9   10
Read
         P   L     ;
         1   2     3   4   5   6   7   8   9   10
Answer
         P   L   P1 P1 P1      ;


PR       SPEECH PROCESSOR
         1   2     3   4   5   6   7   8   9   10   P1 0: Speech Processor
Set
         P   R   P1 P2     ;                           1: Parametric Microphone Equalizer
         1   2     3   4   5   6   7   8   9   10   P2 1: “OFF”
Read                                                   2: “ON”
         P   R   P1    ;
         1   2     3   4   5   6   7   8   9   10
Answer
         P   R   P1 P2     ;


PS       POWER SWITCH
         1   2     3   4   5   6   7   8   9   10   P1 0: POWER “OFF”
Set
         P   S   P1    ;
         1   2     3   4   5   6   7   8   9   10
Read
         P   S     ;
         1   2     3   4   5   6   7   8   9   10
Answer
         P   S   P1    ;


QI       QMB STORE
         1   2     3   4   5   6   7   8   9   10
Set
         Q   I     ;
         1   2     3   4   5   6   7   8   9   10
Read
         1   2     3   4   5   6   7   8   9   10
Answer


QR       QMB RECALL
         1   2     3   4   5   6   7   8   9   10
Set
         Q   R     ;
         1   2     3   4   5   6   7   8   9   10
Read
         1   2     3   4   5   6   7   8   9   10
Answer


RA       RF ATTENUATOR
         1   2     3   4   5   6   7   8   9   10   P1 0: (Fixed)
Set
         R   A   P1 P2     ;                        P2 0: “OFF”
         1   2     3   4   5   6   7   8   9   10      1: “ON”
Read
         R   A   P1    ;
         1   2     3   4   5   6   7   8   9   10
Answer
         R   A   P1 P2     ;


RG       RF GAIN
         1   2     3   4   5   6   7   8   9   10   P1 0: MAIN-side
Set
         R   G   P1 P2 P2 P2       ;                   1: SUB-side
         1   2     3   4   5   6   7   8   9   10   P2 000 - 255
Read
         R   G   P1    ;
         1   2     3   4   5   6   7   8   9   10
Answer
         R   G   P1 P2 P2 P2       ;


RI       RADIO INFORMATION
         1   2     3   4   5   6   7   8   9   10   11   P1 0: (Fixed)
Set                                                      P2 0: Normal 1: Hi-SWR
                                                         P3 0: Stop 1: Recording 2: Playing
         1   2     3   4   5   6   7   8   9   10   11   P4 0: RX 1: TX 2: TX INHIBIT
Read                                                     P5 0: (Fixed)
         R   I   P1    ;
                                                         P6: 0: Antenna tuner: Tuning stopped 1:Antenna tuner: Tuning
         1   2     3   4   5   6   7   8   9   10   11   P7: 0: Scan Stop 1:Scanning 2:Scan Pause
Answer
         R   I   P1 P2 P3 P4 P5 P6 P7 P8             ;   P8: 0: SQL Closed 1: SQL Open (BUSY)




                                                             22
```


## Página 24

```text
CAT (Computer Aided Transceiver) Operation
RL       NOISE REDUCTION LEVEL (DNR)
         1   2   3    4   5   6   7   8   9   10   P1 0: MAIN-side
Set
         R   L   P1 P2 P2     ;                       1: SUB-side
         1   2   3    4   5   6   7   8   9   10   P2 00: “OFF”, 01 -10
Read
         R   L   P1   ;
         1   2   3    4   5   6   7   8   9   10
Answer
         R   L   P1 P2 P2     ;


RM       READ METER
         1   2   3    4   5   6   7   8   9   10   P1=0
Set
                                                       P2: Meter 000 - 255 (MAIN-side)
         1   2   3    4   5   6   7   8   9   10
                                                       P3: Meter 000 - 255 (SUB-side)
Read                                               P1= 1: S (Main-side) 2: S (SUB-side)    3: COMP       4: ALC     5: PO
         R   M   P1   ;                                6: SWR           7: IDD             8: VDD
         1   2   3    4   5   6   7   8   9   10       P2: 000 - 255
Answer                                                 P3: 000 (Fixed)
         R   M   P1 P2 P2 P2 P3 P3 P3         ;


SC       SCAN
         1   2   3    4   5   6   7   8   9   10   P1 0: MAIN-side
Set
         S   C   P1 P2    ;                           1: SUB-side
         1   2   3    4   5   6   7   8   9   10   P2 0: Scan “OFF”
Read                                                  1: Scan “ON” (UP ward)
         S   C   ;
                                                      2: Scan “ON” (DOWN ward)
         1   2   3    4   5   6   7   8   9   10
Answer
         S   C   P1 P2    ;


SD       CW BREAK-IN DELAY TIME
         1   2   3    4   5   6   7   8   9   10   00: 30       01: 50      02: 100       03: 150      04: 200      05: 250
Set                                                06: 300 - 33: 3000 (msec)
         S   D   P1 P1    ;
         1   2   3    4   5   6   7   8   9   10
Read                                               NOTE: 06 to 33: 100 msec steps
         S   D   ;
         1   2   3    4   5   6   7   8   9   10
Answer
         S   D   P1 P1    ;


SF       FUNC KNOB FUNCTION
         1   2   3    4   5   6   7   8   9   10   P1 0: FUNC knob
Set
         S   F   P1 P2    ;                        P2 0: -                1: SCOPE LEVEL            2: PEAK           3: COLOR
         1   2   3    4   5   6   7   8   9   10      4: CONTRAST         5: DIMMER                 6: -              7: MIC GAIN
Read                                                  8: PROC LEVEL       9: AMC LEVEL              A: VOX GAIN       B: VOX DELAY
         S   F   P1   ;
                                                      C: -                D: RF POWER               E: MONI LEVEL     F: CW SPEED
         1   2   3    4   5   6   7   8   9   10
Answer                                                G: CW PITCH         H: BK-DELAY
         S   F   P1 P2    ;




                                                            23
```


## Página 25

```text
CAT (Computer Aided Transceiver) Operation
SH       WIDTH
         1   2   3    4     5        6     7       8        9   10   P1 0: MAIN-side
Set
         S   H   P1 P2 P3 P3               ;                            1: SUB-side
         1   2   3    4     5        6     7       8        9   10   P2 0: (Fixed)
Read                                                                 P3 00 - 23 (See Table 5)
         S   H   P1   ;
         1   2   3    4     5        6     7       8        9   10
Answer
         S   H   P1 P2 P3 P3               ;


                                                                     Table 5 (Bandwidth Chart)
                      Command                                                        Bandwidth
                                                                 CW-L / CW-U /
                                                                DATA-L / DATA-U /                      AM / FM-N /
                          P3                   LSB / USB                                AM-N                             FM / DATA-FM
                                                                RTTY-L / RTTY-U                        DATA-FM-N
                                                                      PSK
                      00 (Default)             (Default)*          (Default)*             -                 -                  -
                          01                     300 Hz                50 Hz        6000 Hz (Fixed)         -                  -
                          02                     400 Hz              100 Hz               -           9000 Hz (Fixed)          -
                          03                     600 Hz              150 Hz               -                 -           16000 Hz (Fixed)
                          04                     850 Hz              200 Hz               -                 -                  -
                          05                    1100 Hz              250 Hz               -                 -                  -
                          06                    1200 Hz              300 Hz               -                 -                  -
                          07                    1500 Hz              350 Hz               -                 -                  -
                          08                    1650 Hz              400 Hz               -                 -                  -
                          09                    1800 Hz              450 Hz               -                 -                  -
                          10                    1950 Hz              500 Hz               -                 -                  -
                           11                   2100 Hz              600 Hz               -                 -                  -
                          12                    2250 Hz              800 Hz               -                 -                  -
                          13                    2400 Hz             1200 Hz               -                 -                  -
                          14                    2450 Hz             1400 Hz               -                 -                  -
                          15                    2500 Hz             1700 Hz               -                 -                  -
                          16                    2600 Hz             2000 Hz               -                 -                  -
                          17                    2700 Hz             2400 Hz               -                 -                  -
                          18                    2800 Hz             3000 Hz               -                 -                  -
                          19                    2900 Hz             3200 Hz               -                 -                  -
                          20                    3000 Hz             3500 Hz               -                 -                  -
                          21                    3200 Hz             4000 Hz               -                 -                  -
                          22                    3500 Hz                 -                 -                 -                  -
                          23                    4000 Hz                 -                 -                 -                  -

                                         *(The default bandwidth varies depending on the selected mode.)

SM       S-METER READING
         1   2   3    4     5        6     7       8        9   10   P1 0: MAIN-side
Set
                                                                        1: SUB-side
         1   2   3    4     5        6     7       8        9   10   P2 000 - 255
Read
         S   M   P1   ;
         1   2   3    4     5        6     7       8        9   10
Answer
         S   M   P1 P2 P2 P2               ;


SQ       SQUELCH LEVEL
         1   2   3    4     5        6     7       8        9   10   P1 0: MAIN-side
Set
         S   Q   P1 P2 P2 P2               ;                            1: SUB-side
         1   2   3    4     5        6     7       8        9   10   P2 000 - 255
Read
         S   Q   P1   ;
         1   2   3    4     5        6     7       8        9   10
Answer
         S   Q   P1 P2 P2 P2               ;




                                                                               24
```


## Página 26

```text
CAT (Computer Aided Transceiver) Operation
SS       SPECTRUM SCOPE
         1     2   3    4   5   6   7   8   9   10   P1 0: (Fixed)
Set
         S   S     P1 P2 P3 P4 P5 P6 P7         ;    P2 0: SPEED      1: PEAK 2: MARKER 3: COLOR           4: LEVEL    5: SPAN
         1     2   3    4   5   6   7   8   9   10      6: MODE      7: AF-FFT/OSCILLOSCOPE
Read                                                   P2=0 (SPEED):
         S   S     P1 P2    ;
                                                     		 P3 0: SLOW1 1: SLOW2 2: FAST1 3: FAST2 4: FAST3 5: STOP
         1     2   3    4   5   6   7   8   9   10
Answer                                               		 P4 - P7: 0: (Fixed)
         S   S     P1 P2 P3 P4 P5 P6 P7         ;      P2=1 (PEAK):
                                                     		 P3 0: LV1 1: LV2 2: LV3 3: LV4 4: LV5
                                                     		 P4 - P7: 0: (Fixed)
                                                       P2=2 (MARKER):
                                                     		 P3 0: MARKER “OFF” 1: MARKER “ON”
                                                     		 P4 - P7: 0: (Fixed)
                                                       P2=3 (COLOR):
                                                     		 P3 0: COLOR-1 - A: COLOR-11
                                                     		 P4 - P7: 0: (Fixed)
                                                       P2=4 (LEVEL):
                                                     		 P3 - P7: -30.0 - -00.0 or +00.0 - +30.0 (0.5 dB steps, 5 bytes)
                                                       P2=5 (SPAN):
                                                     		 P3 0: -            1: -           2: 5 kHz     3: 10 kHz 4: 20 kHz 5: 50 kHz
                                                     			      6: 100 kHz 7: 200 kHz 8: 500 kHz 9: 1 MHz
                                                     		 P4 - P7: 0: (Fixed)
                                                       P2=6 (MODE):
                                                     		 P3 0: 3DSS CENTER                      1: 3DSS CURSOR                2: 3DSS FIX
                                                     			      3: -                             4: W/F CENTER (NORMAL)        5: -
                                                     			      6: -                             7: W/F CURSOR (NORMAL)        8: -
                                                     			      9: -                             A: W/F FIX (NORMAL)           B: -
                                                     		 P4 - P7: 0: (Fixed)
                                                       P2=7 (AF-FFT/OSCILLOSCOPE):
                                                     		 P3 0: AF-FFT (ATT=0dB)         1: AF-FFT (ATT=10dB)       2: AF-FFT (ATT=20dB)
                                                     		 P4 0: OSC Level RX (0dB) 1: OSC Level RX (10dB)           2: OSC Level RX (20dB)
                                                     		 P5 0: OSC Time (1 msec)        1: OSC Time (3 msec)       2: OSC Time (10 msec)
                                                     			      3: OSC Time (30 msec) 4: OSC Time (100 msec) 5: OSC Time (300 msec)
                                                     		 P6 0: OSC Level TX (0dB) 1: OSC Level TX (10dB)           2: OSC Level TX (20dB)
                                                     		 P7 0: (Fixed)


ST       SPLIT
         1     2   3    4   5   6   7   8   9   10   P1 0: SPLIT “OFF”
Set
         S   T     P1   ;                               1: SPLIT “ON”
         1     2   3    4   5   6   7   8   9   10
Read
         S   T     ;
         1     2   3    4   5   6   7   8   9   10
Answer
         S   T     P1   ;


SV       SWAP VFO
         1     2   3    4   5   6   7   8   9   10   Changes the MAIN-side and SUB-side
Set
         S   V     ;
         1     2   3    4   5   6   7   8   9   10
Read
         1     2   3    4   5   6   7   8   9   10
Answer


TS       TXW
         1     2   3    4   5   6   7   8   9   10   P1 0: TXW “OFF”
Set
         T   S     P1   ;                               1: TXW “ON”
         1     2   3    4   5   6   7   8   9   10
Read
         T   S     ;
         1     2   3    4   5   6   7   8   9   10
Answer
         T   S     P1   ;


TX       TX SET
         1     2   3    4   5   6   7   8   9   10   P1 0: RADIO TX “OFF”, CAT TX “OFF”
Set
         T   X     P1   ;                               1: RADIO TX “OFF”, CAT TX “ON”
         1     2   3    4   5   6   7   8   9   10      2: RADIO TX “ON”, CAT TX “OFF” (Answer)
Read
         T   X     ;
         1     2   3    4   5   6   7   8   9   10
Answer
         T   X     P1   ;




                                                              25
```


## Página 27

```text
CAT (Computer Aided Transceiver) Operation
UP       MIC UP
         1   2    3    4   5   6   7   8   9   10
Set
         U   P    ;
         1   2    3    4   5   6   7   8   9   10
Read
         1   2    3    4   5   6   7   8   9   10
Answer


VD       VOX DELAY TIME / DATA VOX DELAY TIME
         1   2    3    4   5   6   7   8   9   10   P1 00: 30 msec     01: 50 msec 02: 100 msec       03: 150 msec     04: 200 msec
Set
         V   D    P1 P1    ;                           05: 250 msec    06: 300 msec - 33: 3000 msec (06 - 33: 10 msec multiples)
         1   2    3    4   5   6   7   8   9   10   NOTE: VD command sets individual parameter values with the setting values “MIC” and
Read
         V   D    ;                                 “USB or BLUETOOTH” in the menu items [OPERATION SETTING] → [TX GNRL] →
         1   2    3    4   5   6   7   8   9   10   → [VOX SELECT].
Answer
         V   D    P1 P1    ;


VE       FIRMWARE VERSION
         1   2    3    4   5   6   7   8   9   10   P1 0: MAIN CPU 1: DISPLAY CPU          2: SDR    3: DSP   4: SPA-1    5: FC-80
Set                                                 P2 XX-XX (Binary Coded Decimal)
         1   2    3    4   5   6   7   8   9   10
Read
         V   E    P1   ;
         1   2    3    4   5   6   7   8   9   10
Answer
         V   E    P1 P2 P2 P2 P2       ;


VG       VOX GAIN
         1   2    3    4   5   6   7   8   9   10   P1 000 - 100
Set
         V   G    P1 P1 P1     ;
         1   2    3    4   5   6   7   8   9   10
Read
         V   G    ;
         1   2    3    4   5   6   7   8   9   10
Answer
         V   G    P1 P1 P1     ;


VM       MAIN-SIDE TO MEMORY CHANNEL
         1   2    3    4   5   6   7   8   9   10
Set
         V   M    ;
         1   2    3    4   5   6   7   8   9   10
Read
         1   2    3    4   5   6   7   8   9   10
Answer


VM       VFO / MEMORY CHANNEL
         1   2    3    4   5   6   7   8   9   10   P1 0: MAIN-side
Set
         V   M    P1 P2 P2     ;                       1: SUB-side
         1   2    3    4   5   6   7   8   9   10   P2 00: VFO               10: MT                     11: Memory       20: PMS
Read                                                   21: P-01L - P-50U     51: 5MHz Band Memory       91: EMG
         V   M    P1   ;
         1   2    3    4   5   6   7   8   9   10
Answer
         V   M    P1 P2 P2     ;



VS       VFO SELECT
         1   2    3    4   5   6   7   8   9   10   P1 0: MAIN-side TX/RX, SUB-side RX
Set
         V   S    P1   ;       ;                       1: MAIN-side RX, SUB-side TX/RX
         1   2    3    4   5   6   7   8   9   10
Read
         V   S    ;
         1   2    3    4   5   6   7   8   9   10
Answer
         V   S    P1   ;


VX       VOX STATUS
         1   2    3    4   5   6   7   8   9   10   P1 0: VOX “OFF”
Set
         V   X    P1   ;       ;                       1: VOX “ON”
         1   2    3    4   5   6   7   8   9   10
Read
         V   X    ;
         1   2    3    4   5   6   7   8   9   10
Answer
         V   X    P1   ;



                                                             26
```


## Página 28

```text
CAT (Computer Aided Transceiver) Operation
ZI       ZERO IN
         1   2     3   4   5   6   7   8   9   10   (CW AUTO ZERO IN Function)
Set
         Z   I   P1    ;                            P1 0: MAIN-side
         1   2     3   4   5   6   7   8   9   10      1: SUB-side
Read
         1   2     3   4   5   6   7   8   9   10
Answer




                                                           27
```


## Página 29

```text
Copyright 2025
YAESU MUSEN CO., LTD.
All rights reserved.
No portion of this manual may be
reproduced without the permission of
YAESU MUSEN CO., LTD.

YAESU MUSEN CO., LTD.
Omori Bellport Building D-3F
6-26-3 Minami-Oi, Shinagawa-ku, Tokyo, 140-0013, Japan
YAESU USA
6125 Phyllis Drive, Cypress, CA 90630, U.S.A.
YAESU UK
Unit 4, Concorde Park, Concorde Way, Segensworth North,
Fareham, Hampshire PO15 5FG, United Kingdom               2507-B
```
