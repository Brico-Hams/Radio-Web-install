# FTX-1 Series Operation Manual (EH084M201, 2506E-DS)

Texto extraído de `FTX-1_OM_ENG_EH084M201_2506E-DS.pdf` (88 páginas) com `pdftotext -layout`, página a página, 
para uso como contexto. Tabelas e diagramas aparecem como texto alinhado; em caso de dúvida consulte o PDF.


## Página 1

```text
HF/50/144/430MHz ALL MODE TRANSCEIVER



Operation Manual
```


## Página 2

```text
   Table of Contents
General Description.......................................2                 Adjusting the brightness (DIMMER).........30
Safety Precautions.........................................4              PMG (Primary Memory Group)
Accessories & Options..................................6                  for VHF/UHF................................................31
  Supplied Accessories....................................6               PMG Screen................................................31
  Available options...........................................6           Register the frequency to PMG...................31
Installation and Interconnections.................7                       Unregister the Channel
  Installing the Battery Pack............................7                (Frequency) registered in PMG...................32
  Charging the Battery Pack............................7                  DSP interference removal functions...........34
  Microphone, Headphone, Key and                                            Adjusting the GAIN of the
  Keyer Connections........................................8                CONTOUR Circuit....................................36
Field Head Controls & Switches...................9                          Sets the Bandwidth (“Q”) of the
    Switching the operation of the                                          CONTOUR Circuit....................................37
    [AF/RF/SQL] knob.......................................9              Split..............................................................37
Rear Panel of the Field Head                                             Voice Communications (SSB and AM).......38
(FTX-1 Field)..................................................15         Speech Processor.......................................39
Rear Panel of the Main Body                                               RF Power output control..............................39
(FTX-1 optima)..............................................16            MONITOR....................................................39
Display Indications.......................................17              CLAR (Clarifier)...........................................40
  Dual band screen (Left/Right)..................... 17                     RX Clarifier...............................................40
  Dual band screen (Up/Down)......................18                        Adjust transmit frequency to the
  Single band screen......................................18                offset frequency........................................40
SSM-75E Microphone Switches..................19                             TX Clarifier................................................40
Display Details..............................................20             To offset the frequency with the
  Frequency Display.......................................20                TX Clarifier Adjust receive frequency.......40
    Keyboard Frequency Entry.......................20                     QRP Mode................................................... 41
    Tuning in 1 MHz or 1 kHz Steps...............20                       DNR (Digital Noise Reduction)................... 41
  Meter Display...............................................20          Voice Memory.............................................42
  Filter Function Display.................................21                Recording Your Own Voice in Memory....42
    Turn the spectrum display OFF................21                         Checking the Recording...........................42
  Information displayed on the                                              Transmitting the Recorded Message.......42
  scope screen...............................................21           Record the received audio..........................43
  Operation of the display [FUNC] knob........22                            Recording the received audio...................43
  Important Receiver Settings.......................24                      Play the recorded content.........................43
    ATT (Attenuator).......................................24               Erase the recorded content......................43
    IPO............................................................24     Using the Automatic Antenna Tuner...........44
    AMP..........................................................24         ATU Operation..........................................44
    DNF (Digital NOTCH Filter)......................24                   CW Mode Operation.....................................46
    AGC (Automatic Gain Control).................24                       Adjusting the Sidetone Audio level.............46
  Information displayed on the                                            CW Spotting (Zero-Beating)........................46
  scope screen...............................................25             ZIN.............................................................46
  Scope Display Setting.................................26                  SPOT.........................................................46
    CENTER/CURSOR/FIX...........................26                        CW Delay Time Setting...............................47
    CENTER...................................................26           Setting of the Electronic Keyer....................47
    CURSOR...................................................26             Adjusting the Keyer Speed.......................47
    FIX.............................................................27      Setting the Keyer Weight
    3DSS.........................................................27         (Dot/Dash) Ratio.......................................47
    MULTI........................................................27         Reversing the Keyer Polarity....................47
    SPAN.........................................................28         Selecting the Keyer Operating Mode.......47
    SPEED......................................................28         Contest Memory Keyer................................48
    Set with the FUNC knob...........................29                     Message Memory.....................................48
    LEVEL.......................................................29          Storing a Message into Memory...............48
    PEAK.........................................................29         Message Memory Programming..............48
    MARKER...................................................30             (Using your Paddle)..................................48
    COLOR.....................................................30            Checking the CW Memory Contents........48
    Adjust contrast..........................................30             On-The-Air CW Message Playback.........48
```


## Página 3

```text
 Text Memory................................................49       Interconnections to FTX-1 optima............ 74
   Text Memory Storage...............................49              Setup the transceiver................................75
   Text Message Programming.....................49                   Tuning Operation......................................75
   Checking the CW Memory Contents........49                       FC-80 Automatic Antenna Tuner................75
   On-The-Air CW Message Playback.........49                         Setup the transceiver................................75
FM / C4FM Mode Operation.........................51                  Tuning Operation......................................75
 Selecting the Communication Mode........... 51                    Active-Tuning Antenna System
   Using AMS (Automatic Mode Select)                               (ATAS-120A)................................................76
   function for VHF/UHF............................... 51            Interconnections to FTX-1........................76
   Fixing the Communication Mode.............. 51                    Setup the transceiver................................77
 Repeater Operation..................................... 51          Tuning Operation......................................77
DATA (FT8 / RTTY / PSK) Operation............52                      Manual Tuning..........................................77
 Connecting to a Personal Computer...........52                    Bluetooth Unit BU-6....................................78
 FT8 Operation.............................................52      Side Carry Handle MHG-1..........................78
   Change the [PRESET] setting..................53                Resetting the Microprocessor.....................79
 RTTY Operation..........................................54       Specifications...............................................80
 PSK Operation............................................54       General........................................................80
Memory Operation........................................55         Transmitter...................................................80
 Memory Storage..........................................55        Receiver......................................................81
 Recall a Memory Channel other.................55                 YAESU LIMITED WARRANTY......................82
 than the last used VFO frequency...............55                Display the Certifications of FCC................84
   Moving Memory Data to the
   VFO register..............................................55
   Transfer last used memory to VFO...........56
   Memory Tune Operation...........................56
 Recall only memories in the same
 frequency band (Band) using the ...............57
 MAG (Memory Auto Grouping) function.....57
   Registering frequently used memory
    channels in M-GRP (Memory Group)......58
   Unregistering memory from
   M-GRP (Memory Group)..........................58
 Edit memory................................................59
   Erasing Memory Channel Data................59
   Check Memory Channel Status................59
   Labeling Memories...................................59
   Scan Skip Setting.....................................60
   60-Meter (5 MHz) Band
   (U.S. and U.K. Version only).....................60
VFO and Memory Scanning.........................62
 VFO/Memory Scan......................................62
Other Functions............................................63
 Band Stack Operation.................................63
 TOT (Time Out Timer).................................63
 Operation on Alaska Emergency
 Frequency: 5167.5kHz.................................63
 Using the microSD Card.............................64
   microSD Cards that can be used.............64
   Installing the microSD card......................64
   Removing the microSD card.....................64
   Formatting a microSD card......................64
   Reading Memory and Set Menu data.......66
Setting Menu.................................................67
 Using the Menu...........................................67
 Tables of Menu list Operations....................68
Optional Accessories...................................74
 FC-40 External Automatic Antenna
 Tuner (for Wire Antenna)............................. 74

                                                                                                                                 1
```


## Página 4

```text
    General Description
The FTX-1 can be used in a variety of ways, from field operation using batteries to mobile opera-
tion.

    FTX-1 Field
    The included high-capacity lithium-ion battery “SBR-52LI” can be mounted on the back, allow-
    ing for long-term field operation of approximately 9 hours on the HF ​​band in SSB with trans-
    mission output of 6W (5W in QRP mode).
    When connected to an external power source (DC 13.8V), operating with a transmission out-
    put of 10W is possible.
    The battery and antenna tuner “FC-80” (optional) can be installed at the same time, so anten-
    na tuning can be performed even in field operation.
    When performing continuous transmission such as data communication using an external
    power source, the cooling fan “SCF-1” (optional) can be attached to efficiently cool the heat
    generated by the radio.
    FTX-1 optima
    High power output of 100W*1 allows for full-scale fixed station operation.
    The panel can be removed from the main unit and attached to a commercially available stand,
    etc., to operate at your preferred angle.
    *1: 50W for 144MHz and 430MHz bands


Full coverage of HF to UHF bands in all modes
Full coverage of amateur radio bands from 1.8 to 430MHz in all modes (SSB/CW/AM/FM/C4FM
digital). General coverage reception from 30kHz to 174MHz and 400 to 470MHz is possible.

Supports simultaneous reception of two bands* and simultaneous C4FM/
C4FM digital playback
Supports simultaneous reception of two bands*. It can be used in a variety of ways, such as enjoy-
ing DX in SSB mode on HF while monitoring local club stations in C4FM digital on V/U.
* Simultaneous reception of HF/HF is not supported.

High-brightness TFT full-color display with touch-panel functionality
The FTX-1 is equipped with a 4.3-inch full-color TFT display. Operating functions, including the re-
ceiving band noise and signal interference reduction tools, are graphically displayed. Even while in-
volved in rigorous operations, such as DXpeditions and contests, the operator may instantly grasp
the status of each function.

Filter Function Display monitors the status of the passband
In the display, a filter function display presents the state of the pass-band. In addition to the operat-
ing state of the interference removal functions, the filter function information is displayed. Not only
can you grasp the operating status of WIDTH, SHIFT, NOTCH and CONTOUR at a glance, you can
also view the status of the RF spectrum in the passband.

3DSS method adopted
In addition to the conventional waterfall display, a 3DSS (3 Dimensions Spectrum Stream) image
method has been adopted. The 3DSS image uses the horizontal axis (X axis) for frequency, the
vertical axis (Y axis) for signal intensity, and the Z axis for time. Compared to the conventional wa-
terfall method, the signal strength is displayed in three dimensions as well as in color, recognition of
changes in the band conditions is instant, convenient and intuitive.




2
```


## Página 5

```text
Two selectable RF Stages amplify the desired signals from low band to
high band
RF amplifier AMP1, and AMP2 are low noise negative feedback RF amplifiers that may be selected
or combined in series as is needed for various low-band, high-band, frequency and noise condi-
tions. In addition, the IPO (Intercept Point Optimization) function maximizes the dynamic range and
enhances the close multi-signal and inter-modulation characteristics of the receiver. The influence
of strong broadcasting stations, especially in the low bands, can be minimized.

Monitor 5 channels in the VHF/UHF band and operate efficiently using
PMG (Primary Memory Group)
The PMG function scans up to 5 channels registered to the PMG. The receive status of each chan-
nel is simultaneously displayed in real time with a bar graph.
* Frequencies between 108MHz and 470MHz can be registered.

Super-DX
The Super DX function increases the sensitivity of the RF amplifier when the received signal is
weak, expanding the calling range.

MAG (Memory Channel Band Auto Grouping)
The memory channels are automatically categorized in each band, so that memory channels can
be easily and quickly recalled.

High quality sound and loud volume from 2-way front speakers
Equipped with two speakers of different diameters, the sound is emitted from the opening at the
bottom of the front panel, reproducing high quality sound at a volume sufficient for field operation.
The FTX-1 optima has a large 66mm, 2.5W high quality speaker on top of the rear case, ensuring
sufficient volume for fixed station operation.

QRP mode allows you to set the maximum transmission output to 5W
Equipped with a QRP mode that allows you to set the maximum transmission output to “5W” on all
bands. This is useful for QRP contests.




                                     About TFT Displays
   FTX-1 series utilizes a TFT liquid-crystal display.
   Although TFT liquid-crystal displays are made using very precise technology, they are prone
   to develop dead pixels (dark dot) or pixels that are always on (bright dot). Please under-
   stand that such phenomena do not constitute product defects or malfunctions. Rather, this
   phenomenon occurs due to limitations in the manufacturing technology with respect to TFT
   liquid-crystal displays.
   Depending on the viewing angle, unevenness in color or brightness may occur. Please note
   that any unevenness observed is inherent to the construction of TFT liquid crystal displays
   and therefore does not constitute a product defect or malfunction.
   If your TFT liquid-crystal display becomes dirty, please use a dry soft cloth or tissue to wipe
   the display clean. If it is extremely dirty, moisten it with water or lukewarm water and wipe it
   off with a soft cloth that has been wrung out tightly. Use of glass cleaner, household cleaners,
   organic solvents, alcohol, abrasives, and/or like substance may damage the TFT liquid-crys-
   tal display.


                                                                                                      3
```


## Página 6

```text
    Safety Precautions
     Be sure to read these important precautions, and use this product safely.
Yaesu is not liable for any failures or problems caused by the use or misuse of this product by the
purchaser or any third party. Also, Yaesu is not liable for damages caused through the use of this product
by the purchaser or any third party, except in cases where ordered to pay damages under the laws.
Types and meanings of the marks
                                This mark indicates an imminently hazardous situation, which, if not
        DANGER                  avoided, could result in death or serious injury.
                                This mark indicates a potentially hazardous situation, which, if not
        WARNING                 avoided, could result in death or serious injury.
                                This mark indicates a potentially hazardous situation, which, if not avoided,
        CAUTION                 may result in minor or moderate injury or only property damage.

Types and meanings of symbols
        These symbols signify prohibited actions, which must not be done to use this product safely.
        For example:    indicates that the product should not be disassembled.
        These symbols signify required actions, which must be done to use this product safely. For
        example,:   indicates that the power plug should be disconnected.


                                                      DANGER
      Do not use the device in “regions or aircrafts and       Do not transmit in crowded places in consider-
      vehicles where its use is prohibited” such as in         ation of people who are fitted with medical devic-
      hospitals and airplanes.                                 es such as heart pacemakers.
      This may exert an impact on electronic and medical       Electromagnetic waves from the device may affect
      devices.                                                 the medical device, resulting in accidents caused by
                                                               malfunctions.
      Do not use this product while driving or riding a
      motorbike. This may result in accidents.                 When an alarm goes off with the external anten-
      Make sure to stop the car in a safe location first       na connected, cut off the power supply to this
      before use if the device is going to be used by the      radio immediately and disconnect the external
      driver.                                                  antenna from this radio.
                                                               If not, this may result in fire, electric shock and equip-
      Do not operate the device when flammable gas             ment failure.
      is generated.
      Doing so may result in fire and explosion.               Do not touch any liquid leaking from the liquid
                                                               display with your bare hands.
      Never touch the antenna during transmission.             There is a risk of chemical burns occurring when
      This may result in injury, electric shock and equip-     the liquid comes into contact with the skin or gets
      ment failure.                                            into the eyes. In this case, seek medical treatment
                                                               immediately.



                                                    WARNING
      Do not use voltages other than the specified power       When smoke or strange odors are emitted from
      supply voltage.                                          the radio, turn off the power and disconnect the
      Doing so may result in fire and electric shock.          power cord from the socket.
                                                               This may result in fire, liquid leak, overheating, dam-
      Do not transmit continuously for long periods of time.   age, ignition and equipment failure. Please contact
      This may cause the temperature of the main body          our company amateur customer support or the retail
      to rise and result in burns and failures due to over-    store where you purchased the device.
      heating.
                                                               Keep the power plug pins and the surrounding
      Do not dismantle or modify the device.                   areas clean at all times.
      This may result in injury, electric shock and equip-     This may result in fire, liquid leak, overheating,
      ment failure.                                            breakage, ignition etc.
      Do not handle the power plug and connector etc.          Disconnect the power cord and connection ca-
      with wet hands. Also do not plug and unplug the          bles before incorporating items sold separately
      power plug with wet hands.                               and replacing the fuse.
      This may result in injury, liquid leak, electric shock   This may result in fire, electric shock and equipment
      and equipment failure.                                   failure.



4
```


## Página 7

```text
Never cut off the fuse holder of the DC power cord.      Do not pull the cable when plugging and unplug-
This may cause short-circuiting and result in ignition   ging the power cord and connection cables.
and fire.                                                Please hold the plug or connector when unplugging.
                                                         If not, this may result in fire, electric shock and equip-
Do not allow metallic objects such as wires and          ment failure.
water to get inside the product.
This may result in fire, electric shock and equipment    Refrain from using headphones and earphones
failure.                                                 at a loud volume.
                                                         Continuous exposure to loud volumes may result in
Do not place the device in areas that may get wet        hearing impairment.
easily (e.g. near a humidifier).
This may result in fire, electric shock and equipment    Do not use the device when the power cord and
failure.                                                 connection cables are damaged, and when the
                                                         DC power connector cannot be plugged in tightly.
When connecting a DC power cord, pay due care            Please contact our company amateur customer
not to mix up the positive and negative polarities.      support or the retail store where you purchased the
This may result in fire, electric shock and equipment    device as this may result in fire, electric shock and
failure.                                                 equipment failure.
Do not use DC power cords other than the one             Follow the instructions given when installing
enclosed or specified.                                   items sold separately and replacing the fuse.
This may result in fire, electric shock and equipment    This may result in fire, electric shock and equipment
failure.                                                 failure.
Do not bend, twist, pull, heat and modify the pow-       Do not use the device when the alarm goes off.
er cord and connection cables in an unreason-            For safety reasons, please pull the power plug of the
able manner.                                             DC power equipment connected to the product out
This may cut or damage the cables and result in fire,    of the AC socket.
electric shock and equipment failure.                    Never touch the antenna as well. This may result
                                                         in fire, electric shock and equipment failure due to
                                                         thunder.



                                                   CAUTION
Do not place this device near a heating instru-          Do not throw or subject the device to strong im-
ment or in a location exposed to direct sunlight.        pact forces.
This may result in deformation and discoloration.        This may result in equipment failure.
Do not place this device in a location where there       Do not the put this device near magnetic cards
is a lot of dust and humidity.                           and video tapes.
Doing so may result in fire and equipment failure.       The data in the cash card and video tape etc. may
Stay as far away from the antenna as possible            be erased.
during transmission.                                     Do not turn on the volume too high when using a
Long-term exposure to electromagnetic radiation          headphone or earphone.
may have a negative effect on the human body.            This may result in hearing impairment.
Do not wipe the case using thinner and benzene etc.      Do not place the device on an unsteady or slop-
Please use a soft and dry piece of cloth to wipe away    ing surface, or in a location where there is a lot
the stains on the case.                                  of vibration.
                                                         The device may fall over or drop, resulting in fire,
Keep out of the reach of small children.                 injury and equipment failure.
If not, this may result in injuries to children.
                                                         Do not stand on top of the product, and do not
Do not put heavy objects on top of the power             place heavy objects on top or insert objects in-
cord and connection cables.                              side it.
This may damage the power cord and connection            If not, this may result in equipment failure.
cables, resulting in fire and electric shock.            Do not use a microphone other than those speci-
                                                         fied when connecting a microphone to the device.
Do not transmit near the television and radio.           If not, this may result in equipment failure.
This may result in electromagnetic interference.
                                                         Do not touch the heat radiating parts.
Do not use optional products other than those            When used for a long period of time, the temperature
specified by our company.                                of the heat radiating parts will get higher, resulting in
If not, this may result in equipment failure.            burns when touched.
When using the device in a hybrid car or fu-             Do not open the case of the product except when
el-saving car, make sure to check with the car           replacing the fuse and when installing items sold
manufacturer before using.                               separately.
The device may not be able to receive transmissions      This may result in injury, electric shock and equip-
normally due to the influence of noises from the elec-   ment failure.
trical devices (inverters etc.) fitted in the car.
For safety reasons, switch off the power and pull
out the DC power cord connected to the DC pow-
er connector when the device is not going to be
used for a long period of time.
If not, this may result in fire and overheating.




                                                                                                                5
```


## Página 8

```text
    Accessories & Options
Supplied Accessories
Hand Microphone....................................................................................SSM-75E
DC Power Cord
Spare Fuse (25A)
Rechargeable Li-Ion Battery Pack...........................................................SBR-52LI (10.8V, 6400mAh)
Rubber Cap (for DC 13.8V terminal)
Rubber Cap (for EXT SPKR, TUNER/LINEAR terminal)
Plate
Operation Manual
World Map
Sticker

Available options
• Hand Microphone (equivalent to the supplied microphone).............................................SSM-75E
• Reference Microphone.....................................................................................................M-1
• Dual Element Microphone................................................................................................M-100
• Desktop Microphone........................................................................................................M-90D
• Microphone Stand Kit.......................................................................................................M-90MSkit
• Desktop Microphone........................................................................................................M-70D
• Lightweight Stereo Headphone........................................................................................YH-77STA
• 100W (144/430MHz: 50W) RF Power Amplifier (supplied with FTX-1 optima)................SPA-1
• Rechargeable Li-Ion Battery Pack (equivalent to the supplied Battery)...........................SBR-52LI
• HF/50MHz 10W Automatic Antenna Tuner (supplied with spacer)..................................FC-80
• HF/50MHz 10W Long wire/50Ω compatible Automatic Antenna Tuner............................FC-90
• Long wire compatible External Auto Antenna Tuner........................................................FC-40
• Active Tuning Antenna (Automatic Type).........................................................................ATAS-120A
• Antenna Base Kit (for ATAS-120A)...................................................................................ATBK-100
• Active Tuning Antenna (Manual Type)..............................................................................ATAS-25
• Cooling Fan......................................................................................................................SCF-1
• GPS Antenna Unit............................................................................................................FGPS-5
• Bluetooth Unit...................................................................................................................BU-6
• Bluetooth Headset ...........................................................................................................SSM-BT20
• Protection Guard..............................................................................................................SPG-1
• Side Carry Handle (for SPA-1 only).................................................................................MHG-1




6
```


## Página 9

```text
                           Installation and Interconnections
Installing the Battery Pack
                                             Connect the terminal
                                             into the connector of
                                             the FTX-1




                                                                             click


Charging the Battery Pack
The SBR-52LI can be charged in one of the following ways:
             Charges when attached to the FTX-1                          Charging the SBR-52LI by itself




                                                                                             USB PD
                                                                                             45W, 15V 2A

              DC 13.8V, 5A
                              Red: Charging
                              Green: Charge Complete
                              Blinks Red and Green: Charge Error
                                                                                     Red: Charging
                              The LED glows blue when the                            Red (blinks): Charge Error
                              transceiver power is on, whether                       None: Charge Complete
                              the transceiver is still charging
USB PD                        or fully charged.
45W, 15V

     • Do not attach the SBR-52LI to the FTX-1 while charging via USB PD. Doing so may damage the battery.
     • If the external power supply voltage is below 13.8V, the battery may not be fully charged.
     • To charge via the USB Type-C terminal, a commercially available USB PD (Power Delivery) charger
       (output 45W or more, DC15V 2A output compatible) and a Type-C cable compatible with PD are
       required.
     • It takes approximately 7 hours to fully charge the SBR-52LI battery pack when the transceiver
       is turned OFF. If the transceiver is turned ON, the charging time will be longer.
     • Depending on the battery status, the charging time might be increased.
     • 9-hour stand-alone operating time with 6W on HF bands (SSB), and 8-hour operating time with
       6W on V/UHF bands (FM) are available (6-6-48 duty cycle).

   Relationship between connected power source, charging, and transmission/reception
  When connected to USB PD
                                            Receive               Transmit              Charge to SBR-52LI
    When SBR-52LI is installed               Yes                    Yes                 Stops when sending
    When SBR-52LI is not installed           Yes                     No                         ---
  When connected to USB PD and external power DC 13.8V or external power DC 13.8V only
                                            Receive               Transmit              Charge to SBR-52LI
    When SBR-52LI is installed               Yes                    Yes                 Stop when sending
    When SBR-52LI is not installed           Yes                    Yes                         ---


                                                                                                                  7
```


## Página 10

```text
Microphone, Headphone, Key and Keyer Connections



                                                    FTX-1




              φ3.5mm




                                                      FAST
                                                       GND
         A two-contact plug cannot be                  PTT
       ● used in this jack.
                                                        MIC
         Key-up voltage is +5.0 V DC,              MIC GND
       ● and keydown current is 3 mA.
                                                        +5V
                                                         UP
                                                     DOWN

                                        (as as viewed from side panel)




8
```


## Página 11

```text
                             Field Head Controls & Switches




   SUB DIAL                                         and IF stages, to account for noise and signal
Tune the frequency of the SUB-side.                 strength conditions at the moment.
Each press key swaps the MAIN-side and              [AF/RF/SQL] knob is normally in the fully clock-
SUB-side.                                           wise position.

   ON/OFF (LOCK) Switch                                  It does not operate in FM/FM-N/DATA-FM
                                                         and D-FM-N mode.
Press and hold this switch for one second to
turn the transceiver ON or OFF.                     SQL
When the power is ON, press this switch briefly     The squelch system allows the back-ground
to engage, or release the DIAL or SUB DIAL lock.    noise to be muted when no signal is being re-
     • The LED glows blue when the trans-           ceived.
       ceiver power is ON, whether the trans-       Normally, the squelch is not used during SSB
       ceiver is still charging or fully charged.   or CW operation.
     • When the transceiver is powered OFF,         Rotate the [AF/RF/SQL] knob to adjust the
       the LED glows red while charging, turns      squelch until the noise disappears.
       green when charging is complete, and
       blinks red and green in case of a charg-          If the squelch knob is turned too far to the
       ing error.                                        right, weak signals cannot be heard.

   AF/RF/SQL - MAIN               / SUB             • Switching the operation of the
AF (default setting)                                  [AF/RF/SQL] knob
Rotate the Knob to adjust the audio volume          1. Press and hold the [FUNC] knob.
level.                                              2. Select [OPERATION SETTING]→[GENER-
MAIN-side: AF/RF/SQL - MAIN        knob                AL] → [RF/SQL VR].
SUB-side: AF/RF/SQL - SUB        knob               3. Select “RF”, “SQL” or “AUTO”.
Press                                                   RF     Functions as the RF gain adjustment
The operation changes depending on the oper-                   knob.
ating mode (see table below).                           SQL    Functions as the Squelch level adjust-
                                                               ment knob.
 AM / AM-N / FM / FM-N      Functions as the
 C4FM / D-FM / D-FM-N       Squelch level adjust-       AUTO Functions as the squelch level adjust-
 VW                         ment knob.                       ment knob in FM, FM-N, DATA-FM and
                                                             D-FMN modes, and as the RF gain ad-
 LSB / USB / CW-L / CW-U    Functions as the                 justment knob in other modes.
 DATA-L / DATA-U / RTTY-L   RF gain adjustment
 RTTY-U / PSK               knob.                   4. Press the [FUNC] knob, or wait for about 3
RF                                                     seconds to save the setting.
The RF Gain control provides manual adjust-         5. Touch [BACK] several times to return to
ment of the gain levels for the receiver RF            normal operation.

                                                                                                    9
```


## Página 12

```text
     VFO mode indicator                                QMB Channel Recall
Shows the current operating status of the VFO          1. Press the [QMB] key.
at a glance. The indicator lights up in the fol-          The current QMB channel data will be
lowing colors according to the operating status           shown on the frequency display area.
(factory default settings).                               The “VFO” or “Memory Channel number”
                                                          will be replaced by “QMB”.
Blue: Operation on VFO mode                            2. Repeatedly pressing the [QMB] key will step
Green: Operation on Memory mode                           through the QMB channels:
Red: Clarifier Operation                               3. Press the [V/M        ] key to return to the
The lighting colors can be changed by the fol-            VFO mode.
lowing operations:                                     Changing the number of QMB channels
1. Press and hold the [FUNC] knob.                     The QMB channels can be selected from “5
2. Select [DISPLAY SETTING] → [VFO IND                 channels” or “10 channels”.
   COLOR].                                             1. Press and hold the [FUNC] knob.
3. Select the item whose color you want to             2. Select [OPERATION SETTING] → [BAND/
   change.                                                SCAN] → [QMB CH].
4. Rotate the [FUNC] knob, or touch “<” or “>”         3. Select “5ch” or “10ch”.
   on either side of the value to select the Col-      4. Press the [FUNC] knob, or wait for about 3
   or.                                                    seconds to save the setting.
   Select the color of the “3” mark in the table       5. Press the [BACK] key several times to re-
   below for each item.                                   turn to normal operation.
                  Blue Green   Red    White None
       VFO         3     3      –      3     3            BUSY/TX indicator
      Memory       3     3      –      3     3         This indicator glows green* (Blue:C4FM) when
      Clarifier    –     –      3      –     3         the squelch opens, and glows red during trans-
5. Press the [FUNC] knob, or wait for about 3          mit.
   seconds to save the setting.                        * Glows green only when the [AF/RF/SQL]
6. Press the [BACK] key several times to re-             knob is set to “SQL” or “AUTO”.
   turn to normal operation.
                                                          CLAR
     QMB                                               The clarifier is used to adjust the transceiver
The current operation status can be stored in a        receive frequency to match the other station
dedicated memory channel (QMB: Quick Mem-              transmit frequency and improve the audio; or to
ory Bank) with one touch.                              shift the transmit frequency of this station when
QMB Channel Storage                                    the transmit frequency of the contact station is
                                                       shifted.
      The initial number is 5 QMB memories,            The display will indicate “CLAR RX” → “CLAR
      but this can be increased to 10 channels.        TX” → “CLAR RXTX” in red, each time the
                                                       [CLAR] key is pressed, and the clarifier will ac-
1. Tune to the desired frequency on the VFO            tivate.
   mode.
                                                       To adjust the offset frequency of the clarifier,
2. Press and hold the [QMB] key. The “beep”
                                                       turn the “MAIN DIAL” for the MAIN-side and
   will confirm that the VFO contents have
   been written to the currently available QMB         the “SUBDIAL” for the SUB-side.
   memory.                                             To turn the clarifier OFF, repeatedly press the
                                                       [CLAR] key until the Clarifier status is not dis-
      • Repeated pressing and holding of the           played.
        [QMB] key will write the VFO contents
        to successive QMB memories.                    To clear out the programmed clarifier offset al-
      • Once all five (or ten) QMB memories            together, and reset it to “zero,” press and hold
        have data on them, previous data will          the [CLAR] key.
        be over-written on a first-in, first-out ba-   For details, see “CLAR (Clarifier)” on page
        sis.                                           40.



10
```


## Página 13

```text
    BACK                                             FUNC
Press                                             Easily change the menu settings.
Press the this key to return to the previous      The last function used is remembered, so once
screen.                                           you select a function, you can easily change
Press and hold                                    the settings by simply turning the knob.
Press and hold while setting the DSP inter-       For details, see “FUNC knob operation display”
ference removal function (SHIFT, WIDTH,           on page 22.
NOTCH, CONTOUR, APF), and the setting will
return to the default value.                         DISP
                                                  Press
    MAIN DIAL                                     Switches the Operation screen each time the
Tune the frequency of the MAIN-side.              key is pressed.
The amount of frequency change depends on         Press and hold
the operation mode (default setting: see table    Turns off the display.
below).                                           The screen will reappear, if you touch the
                                                  screen or perform any other operation on the
    Operating Mode              1 Step            FTX-1.
       LSB / USB
                        20Hz / [1Hz] / (200Hz)
      CW-L / CW-U                                    Screw hole for bracket
    DATA-L / DATA-U                               The screw hole size is 1/4 inch.
    RTTY-L / RTTY-U     10Hz / [1Hz] / (100Hz)    Mounting holes on the back and bottom.
         PSK
                                                  When attaching a stand to the bottom, you can
       AM / AM-N                                  tilt it by about 5 degrees using the supplied
    FM / FM-N / C4FM    100Hz / [10Hz] / (1kHz)   plate.
    DATA-FM / D-FM-N
[   ]: FINE tuning
(   ): FAST tuning


    FINE/FAST
FINE Tuning (Tuning of 1Hz)
In the LSB, USB, CW-L, CW-U, DATA-L, DA-
TA-U, RTTY-L, RTTY-U or PSK mode, the fre-
quency can be adjusted in 1 Hz steps.
● The AM, AM-N, FM, FM-N, DATA-FM and
  D-FM-N modes may be adjusted in 10 Hz
  steps.
1. Press the [FINE/FAST] key.
   The “FINE” indicator lights in the display.
2. Rotate the MAIN/SUB DIAL knob.
3. Press the [FINE/FAST] key again to return
   to the original frequency step.

FAST Tuning (Tuning of 10 times)
The frequency can be adjusted in 10 times
steps.
1. Press and hold the [FINE/FAST] key.
   The “FAST” indicator lights in the display.
2. Rotate the MAIN/SUB DIAL knob.
3. Press the [FINE/FAST] key again to return
   to the original frequency step.




                                                                                             11
```


## Página 14

```text
                                                    N/W
Turn the GM (group monitor) function ON/OFF.    Press
(For details on the function, refer to the GM   To set the DSP (digital) IF filters to Narrow
Function Instruction Manual which may be        bandwidth.
downloaded from the Yaesu website.)             Press and hold
                                                Switch the operating mode.
     S-DX                                       The operation mode selection screen appears
Press                                           on the display, so touch the desired mode.
Enable the Super DX function to increase sen-
sitivity.
Press and hold
The display on the TFT screen may be saved
on the microSD card.

     PMG
Press
Displays PMG (Primary Memory Group).
Press and hold
Register the displayed frequency in PMG.

      For details, see “PMG (Primary Memory
      Group)” on page 31.


     MAG
In VFO mode
                                                      Touch [PRESET] to display the settings
Each key press switches the operating fre-            that apply to the FT8 operation.
quency band.
Press and hold the [BAND] key, the operation
band selection screen appears on the display,
so touch the desired band. When you touch it,   A powerful capability of the FTX-1 is its flexibili-
the band will be confirmed for about 1 second   ty in Split Frequency operation using the MAIN-
and then return to the operating screen.        side and SUB-side frequency registers. This
In Memory mode                                  makes the FTX-1 especially useful for high-lev-
Each time the key is pressed, only memory       el DX-peditions.
channels of the same frequency band are au-
tomatically recalled as a group.                      For details, see “SPLIT” on page 37.
For details, see “MAG (Memory Channel Band
Auto Grouping)” on page 57.



12
```


## Página 15

```text
   V/M
Press
This key toggles frequency control between
VFO and the memory system.
Press and hold
The memory channel list will be displayed.
From the channel list, touch and select the de-
sired memory channel.

     For details, see “Memory Operation” on
     page 55.


   M►V
Press
Data saved in a memory channel can be trans-
ferred to the VFO.

     For details, see “Moving Memory Data to
     the VFO register” on page 55.

Press and hold
You may freely tune off from any memory chan-
nel in a “Memory Tune” mode, this is similar
to VFO operation. So long as you do not over-
write the contents of the current memory, Mem-
ory Tune operation will not alter the contents of
the memory channel.
● The “MT” notation will appear instead of the
   “M-nnn”.
Press the [V/M      ] key to return to the origi-
nally memorized frequency of the current mem-
ory channel.




                                                    13
```


## Página 16

```text
     PHONE Jack                                       USB (Type-C)
Connect headphones to this standard ϕ3.5 ste-      You can charge the lithium-ion battery SBR-
reo jack.                                          52LI attached to this unit using a commercially
Inserting a headphone plug into this jack will     available USB PD (Power Delivery) charger
deactivate the internal and external speakers.     (output 45W or more, DC15V 2A output com-
                                                   patible) and a PD-compatible Type-C cable.
       AUDIO
       AUDIO
                                                        For information on charging and transmis-
                      GND                               sion/reception when a USB PD charger
                                                        is connected, see “Relationship between
     KEY                                                connected power source, charging, and
This 3.5-mm, 3-contact jack accepts a CW key            transmission/reception” (page 7).
orkeyer paddle. A two-contact plug cannot be
used in this jack. Key-up voltage is +5.0V DC,     Connecting to a computer from this jack with
and keydown current is 3mA.                        a commercially available USB cable allows
                                                   remote control by CAT commands from a com-
           KEY                                     puter. The jack can also be used for input and
            NC                                     output of audio signals and transmitter control.
                    GND
                                                   A USB driver is required for remote control
     When connecting a single straight key         from a computer. Download the driver from the
                                                   Yaesu website (http://www.yaesu.com).
            DOT
           DASH                                       MIC jack
                   COMMON
                                                   This 8-pin jack accepts input from a micro-
When connecting an electronic keyer paddle         phone utilizing the traditional YAESU HF trans-
                                                   ceiver pinout.
     GPS                                                           FAST
This is the terminal for connecting the optional                    GND
GPS antenna unit “FGPS-5”.                                          PTT
                                                                     MIC
                                                                MIC GND
                                                                     +5V
                                                                      UP
                                                                  DOWN

                                                      Bluetooth
                                                   This is the terminal for connecting the optional
                                                   Bluetooth unit “BU-6”.

                                                      microSD card slot
                                                   Insert a commercially available micro SD card
                                                   to backup the various radio settings, memory
                                                   channels, recordings of received audio, etc.




14
```


## Página 17

```text
       Rear Panel of the Field Head (FTX-1 Field)




   ANT (HF/50MHz)                                    EXT SPKR
This is the BNC-type coaxial connnector for the   This 3.5-mm, 2-contact, jack provides audio
HF band to 50MHz antennas (50 ohms).              output for a external loudspeaker.

   ANT (144/430MHz)
This is the BNC-type coaxial connnector for the
144MHz band and 430MHz band antennas (50                  SIGNAL      GND
ohms).

   GND                                               TUNER/LINEAR
Use this terminal to connect the transceiver      This 10-pin output jack is used to connect to
to a good earth ground, for safety and optimal    the External Automatic Antenna Tuner or a Lin-
performance.                                      ear Amplifier.
                                                                   TX GND
   DC 13.8V                                               +13.8V OUT    GND

This is the DC power supply connection for the        TX D(BAND A)            TRST(BAND D)
transceiver.
                                                             TX INH        TX REQ
Use the supplied DC cable to connect directly
                                                          RX D(BAND B) EXTS(DET)BAND C
to a DC power supply.                                               EXT ALC
The white-and-black wire is positive polarity,
and the black wire is negative.                   Refer to the table below for the TUNER/LIN-
                                                  EAR terminal levels when using a linear ampli-
                                                  fier.
                                                              BAND DATA                BAND DATA
                                                  BAND                      BAND
                                                          A     B   C   D          A     B   C   D
                                                   400k   H     L   H   H    21    H     H   H   L
                                                     1    L     H   H   H   24.5   L     L   L   H
              Supplied DC cable                     1.8   H     L   L   L    28    H     L   L   H
                                                    3.5   L     H   L   L    50    L     H   L   H
                                                   5/7    H     H   L   L    70    H     H   H   H
                                                    10    L     L   H   H   144    H     H   L   H
                                                    14    H     L   H   L   430    L     L   H   H
                                                    18    L     H   H   L




                                                                                                15
```


## Página 18

```text
  Rear Panel of the Main Body (FTX-1 optima)




     ANT (144/430MHz)                                  EXT SPKR
This is the M-type coaxial connector for the       This 3.5-mm, 2-contact, jack provides audio
144 MHz band and 430 MHz band antennas (50         output for a external loudspeaker. The imped-
ohms).                                             ance at the jack is 4-8 Ohms.

     DC 13.8V                                          ANT 1/2 (HF/50MHz)
This is the DC power supply connection for the     This is the M-type coaxial connector to con-
transceiver.                                       nect HF band and 50 MHz band antennas (50
Use the supplied DC cable to connect directly      ohms).
to a DC power supply, which must be capable
of supplying at least 25 A @13.8 VDC.                  GND
                                                   Use this terminal to connect the transceiver
                                                   to a good earth ground, for safety and optimal
                                                   performance.



     TUNER
Connect the optional external antenna tuner
“FC-40”.
                    RESET
           TX INH           N.C

             RX D            GND

           TX GND           +13V OUT
                    TX D




                                          Grounding
  To prevent damage from lightning, atmospheric electrical discharges, electric shock etc., pro-
  vide a good earth ground.
  Use a short, thick, braided cable to connect the station equipment to the buried ground rod (or
  alternative earth ground system).

16
```


## Página 19

```text
                                                              Display Indications
Each time you press the [DISP] key, the screen display will change as follows. You can also press
and hold the [DISP] key to temporarily turn off the screen display. The screen will reappear when
you perform any FTX-1 operation, such as touching the screen.
                                         Dual band screen (Left/Right)




               Single band screen                                         Dual band screen (Up/Down)




Dual band screen (Left/Right)
This is a dual band screen that displays the MAIN and SUB frequencies on the left and right. The
scope screen allows you to intuitively visualize changes in the band condition.
                                    SUB side                     MAIN side


                                    Operating Mode          Meter of MAIN side

                    Status of SUB side           Status of MAIN side     FUNC knob set to


                                                                                            Operating Mode

   SUB Frequency                                                                            MAIN Frequency
                                                                                            Displays the
                                                                                            passband status
                                                                                            of the Digital filter.
 Meter of SUB side
                                                                                        ・Displays the mode
Displays the                                                                            ・sweep speed
passband status                                                                         ・span width
of the Digital filter.

                                                                                            Scope screen
                                                                                            settings




                                                                                                                 17
```


## Página 20

```text
Dual band screen (Up/Down)
This is the screen for dual band operation, where MAIN and SUB frequencies are displayed above
and below.
                 Important Receiver Settings for MAIN side




                                                                                 MAIN side




                                                                                 SUB side




                 Important Receiver Settings for SUB side


Single band screen
This is the screen for single band operation where only the MAIN or SUB frequency is displayed.
Each time you press the SUB DIAL knob, it switches between MAIN and SUB.




18
```


## Página 21

```text
                               SSM-75E Microphone Switches
   PTT Switch
Switches Transmit/Receive.
Press to transmit and release to receive.
                                                               MUTE
   DWN/UP
The [UP]/[DWN] keys may also be used to
manually scan the frequency upward or down-
ward.

   MUTE
While pressing the MUTE key, the receiver au-
dio from the speaker will be muted.                  P1   P2   P3     P4



   Microphone
Speak into the microphone in a normal tone of
voice with the microphone 5 cm away from the
mouth.

   P1
This key toggles the ON/OFF lock for the MAIN
Dial knob and SUB Dial. When “Lock” is ON,
the MAIN or SUB Dial knob can still be turned,
but the frequency will not change, and “LOCK”
appears in the display.
It is the same function as the [Power] key on
the front panel of the transceiver.

   P2
The current operation status can be stored in a
dedicated memory channel (QMB: Quick Mem-
ory Bank) with one touch.
It is the same function as the [QMB] key on the
front panel of the transceiver.

   P3
Pressing this key momentarily, change to a
higher Operation Band.
It is the same function as the [MAG              ]
key on the front panel of the transceiver.

   P4
This key toggles frequency control between
VFO and the memory system.
It is the same function as the [V/M          ] key
on the front panel of the transceiver.




                                                                           19
```


## Página 22

```text
  Display Details
Frequency Display                                                 Meter Display
Displays the transmit and receive frequencies.                                        S-Meter

     Simultaneous reception of HF/HF is not
     supported.

• Keyboard Frequency Entry
1. Touch the “Hz” area of the frequency dis-
   play.
                                                                                    RF power Output
                                                                  When the meter display screen is touched, the
                                                                  transmit meter selection screen is shown (the
                                                                  default setting is “PO”).




2. Enter the frequency using the numeric keys.
                                    Erases the rightmost digit.
                                                                           Touch the meter area

                                    The entered frequency is
                                    confirmed.
                                    The display returns to the
                                    previous screen when          AMC gain control display
                                    back is touched.
                                                                  (Displays compression level during
       Clear all entered numbers.                                 speech processor operation)
   ● If there is no operation within 10 seconds,                  Make adjustments by press and hold the [FUNC]
                                                                  knob → touch [AMC LEVEL] → rotate the [FUNC]
      the input will be canceled.
                                                                  knob.
3. Touch [ENT] to confirm.
   ● A short-cut for frequencies ending in zero                   RF power Output      Relative ALC voltage
      -touch [ENT] after the last non-zero digit.
    Example:
    To enter 7.00.000MHz
         [0] → [0] → [7] → [ENT]
         or [7] → [.]→ [ENT]
    To enter 7.03.000MHz
         [7] → [.]→ [0] → [3] → [ENT]
• Tuning in 1 MHz or 1 kHz Steps
To temporarily set the dial knob to 1MHz or                             Standing Wave Ratio           Final amplifier
1kHz steps, touch the “MHz” or “kHz” area of                                                          drain voltage
the frequency display.                                            Final amplifier       Final amplifier temperature
                                                                  drain current




20
```


## Página 23

```text
Filter Function Display
Displays the passband status of the Digital filter. The operation of WIDTH, SHIFT, NOTCH, CON-
TOUR etc. can be observed.
                                     Passband status of DSP filter
                                     (SHIFT, WIDTH)




                                State of NOTCH          State of CONTOUR

           SSB Mode                   CW Mode                RTTY Mode            PSK/DATA Mode



       DSP filter bandwidth

Touch the filter display to reveal and check the setting value of the last used function from SHIFT,
WIDTH, NOTCH, CONTOUR, and APF.
Example: When the last function used is the NOTCH function
          Touch the filter display to display the NOTCH function setting value.




• Turn the spectrum display OFF
To display only the Digital filter bandwidth information, press and hold the spectrum area of the filter
function display to clear the spectrum view. To display it, press and hold again.




Information displayed on the scope screen
                                       CENTER      The receive frequency is always shown at the center of
                                                   the screen and spectrum display.
                                                   The band spectrum is shown within the range set by
                                                   “SPAN”. The CENTER mode is convenient for monitoring
                                                   the signal activity around the operating frequency.
                                       CURSOR      Monitors the spectrum within the range set with “SPAN”.
                                                   When the frequency (marker) exceeds the upper limit or
                                                   the lower limit of the range, the screen is automatically
                                                   scrolled and the status beyond the setting range can be
                                                   observed.
          Scope screen information     FIX         Enter the start frequency of the scope.
                                       SLOW1       sweep speed                     Slow
                                       SLOW2       sweep speed                       ↑
                                       FAST1       sweep speed                    Normal
                                       FAST2       sweep speed                       ↓
                                       FAST3       sweep speed                     Fast
                                       STOP        Temporarily hold the operation of 3DSS display and wa-
                                                   terfall display.
                                       SPAN nnnkHz Scope Screen frequency span (display range).


                                                                                                        21
```


## Página 24

```text
Operation of the display [FUNC] knob
Displays the multiple functions that may be op-
erated when the [FUNC] knob is pressed.
Normally, it is recommended to adjust the lev-
el of the spectrum scope with the [D-LEVEL]
knob.
The last used function is recalled when the
[FUNC] knob is pressed. Therefor you can eas-
ily call up and then set a function by turning the
[FUNC] knob.
To change the function of the [FUNC] knob,
touch the desired item that appears on the
function screen when the [FUNC] knob is press
and hold, or turn the [FUNC] knob to select an
item and then press the [FUNC] knob.

     The last function used is stored as the
     FUNC knob and displayed in the upper
     right corner of the screen.




       Can be easily called up and set by
       turning the [FUNC] knob.




  Wait for about 3 seconds or press the
  FUNC knob, or the [BACK] key to confirm
  the settings and return to the operating
  screen.




22
```


## Página 25

```text
PAGE 1/3     SSB
D-LEVEL             Adjust the LEVEL of the scope for the best image on the screen.
                    Adjust the color density with respect to the signal level on the scope screen in 5 steps (LV1to
D-PEAK
                    LV5).
                    ON/OFF Marker indicates the transmit and receive frequency position within the Scope
D-MARKER
                    Display image.
D-COLOR             Changes the scope screen display or the Frequency color.
D-CONTRAST          Adjust the TFT display contrast (difference between light and dark) in 21 steps.
DIMMER              Adjust the TFT display brightness in 21 steps.
MOX                 Engages the PTT (Push to Talk) circuit to activate the transmitter.
ATT                 Turns the ATT (Attenuator) ON/OFF.
IPO (AMP)           Activates the IPO.
DNF                 Turns the DNF (Digital Notch Filter) ON/OFF.
AGC                 Adjust the AGC receiver-recovery time.
MIC EQ              Three-Band Parametric Microphone Equalizer is turned ON/OFF.
PROC LEVEL          Adjusts the Speech Processor Gain.
ANT TUNE            Starts automatic antenna tuning.
TUNER               Turns the built-in antenna tuner ON/OFF. (FTX-1 optima only)
NB                  Activates the NB (Noise blanker) function.
DNR                 Activates the DNR (Digital Noise Reduction) function.
ANT                 Selects the ANT 1 or ANT 2 connector on the rear panel. (FTX-1 optima only)
TXW                 During split operation, touch [TXW] to listen on the transmitter frequency.
RF POWER            Transmit power setting.
MIC GAIN            Adjusts the microphone gain.
AMC LEVEL           Adjusts the AMC (Automatic Microphone Gain Control) Gain.
VOX                 Turn the VOX function ON/OFF.
VOX GAIN            VOX gain setting.
VOX DELAY           VOX delay setting.

PAGE 2/3     CW
MONI LEVEL          Monitor level adjustment.
KEYER               Built-in electronic keyer is turned ON/OFF.
BK-IN               CW Break-in function is turned ON/OFF.
CW SPEED            Adjusts the desired sending speed.
CW PITCH            Adjusts the CW tone when receiving the CW signal and the side tone monitor.
BK-DELAY            Adjust the hang time after the CW transmitting ends.
ZIN                 Press to activate the auto-zero-in function.
CW SPOT             Press and hold to activate the sidetone.
MESSAGE             CW text memory or Voice memory function.
PLAY                Check the CW Memory Content or Check the Voice Recording Content.
RECORD              Voice recording function.

PAGE 3/3     FM/C4FM
DTMF                Set the DTMF auto dialer channel and code.
T-CALL              Transmits the T-CALL(1750 Hz).
RPT SHIFT           Sets the repeater shift direction.
REV                 Reverses the transmit and receive frequencies in repeater mode or split memory.
DG-ID TX            Setting the transmit DG-ID number.
DG-ID RX            Setting the receive DG-ID number.
APRS S.LIST         Displays the APRS function station list.
APRS M.LIST         Displays the message list of the APRS function.
APRS BEACON         Set APRS Automatic beacon transmitting ON/OFF.
APRS BCN-TX         Transmitting an APRS beacon manually.
CH STEP             Change frequency in set step intervals.
SQL TYPE            Select a squelch type.
TONE FREQ           Set the CTCSS Tone Frequency.
DCS                 Set the DCS code.
HOME                Recalls the HOME channel.
RADIO SETTING       SSB, AM, FM, Data, RTTY & Digital operating mode Menu.
CW SETTING          CW operation Setting Menu.
OPERATION SETTING   Comprehensive settings such as: Transmit & Receive, Interference Reduction, Scan, etc.
DISPLAY SETTING     Display Setting Menu.
EXTENSION SETTING   Date, SD Card Settings, Firmware Version Display & Reset Operation.
APRS SETTING        APRS operation Setting Menu.


                                                                                                                23
```


## Página 26

```text
Important Receiver Settings
The status of various operations that are important during receive, are shown at the bottom of the
display. To change a setting, touch the appropriate location on the display.




                    Important setting items when receiving

• ATT (Attenuator)                                   • AMP
Displays the current ATT (Amount of receive          Increases the sensitivity of the RF amplifier
input signal attenuation).                           when the received signal is weak.
When the desired signal is extremely strong or       After touching [AMP], touch the ON or OFF.
the noise level is high on a low frequency band,
activate the attenuator to reduce the incoming            The AMP feature is only available in the
signal or noise from the antenna.                         AIR band, 144MHz and 430MHz band.
After touching [ATT], touch the ON or OFF.
     • The ATT feature is only available in the      • DNF (Digital NOTCH Filter)
       HF - 50MHz band.                              The Digital NOTCH Filter (DNF) is an effective
     • The ATT is set independently for each         beat-canceling filter that can null out a number
       operation band.                               of interfering beat notes inside the receiver
                                                     passband.
• IPO                                                Because this is an Auto-Notch feature, there is
The IPO (Intercept Point Optimization) function      no djustment knob associated with this filter.
can establish the gain of the RF amplifier sec-      • AGC (Automatic Gain Control)
tion to accommodate the connected antenna
                                                     Displays the currently selected AGC setting.
and the received signal conditions. IPO can be
                                                     The AGC system is designed to help compen-
selected from three operating conditions.
                                                     sate for fading and other propagation effects.
AMP1: One stage RF amplifier is connected.           The AGC characteristics can be individually set
        This is a well-balanced operation of         for each operating mode. The basic objective
        receiver sensitivity and characteristics     of AGC is to maintain a constant audio output
        (Approximately 10 dB gain).                  level once a certain minimum threshold of sig-
AMP2: Two RF amplifiers are connected in             nal strength is achieved.
        series to give top priority to sensitivity   After touching [AGC], touch the desired time
        (Approximately 20 dB gain).                  constant.
IPO: The received signal is input to the IF          ● AGC can be set for each operation band.
        mixer without passing through the RF         ● The “AUTO” selection mode selects the opti-
        amplifier. This can greatly improve             mum receiver-recovery time for the reception
        receiving, especially in the harsh low          mode.
        band signal environment.
After touching [IPO], touch the desired operat-
ing condition.
     • The IPO feature is only available in the
       HF - 50MHz band.
     • IPO is set independently for each oper-
       ation band.




24
```


## Página 27

```text
Information displayed on the scope screen




          /              /      :                                       : Recalls all memory channels regard-
                       The battery condition is displayed in              less of frequency band.
                       3 steps.                                         : Recalls only memory channels in the
          :            Charging                                           HF band.
              :        Appears when the lock function is                : Recalls only memory channels in the
                       enabled.                                           50MHz band.
                      : A warning display to indicate an an-            : Recalls only memory channels in the
                        tenna system error.                               AIR band.
              :        Voice memory playing                             : Recalls only memory channels in the
                                                                          VHF band.
              :        Blinks → Voice memory recording
                                standby                                 : Recalls only memory channels in the
                       Appears → Voice memory recording                   UHF band.
                  :    FINE Tuning                                      : Channels, regardless of the band,
                  :    FAST Tuning                                        can be registered in advance and
                                                                          called up as frequently used memory
                  :    Appears when the Super DX func-
                                                                          channels in the M-GRP.
                       tion is enabled.
                                                               PROC : Appears when the Speech Processor
          :            Appears when the VOX function is
                                                                      function is activated.
                       enabled.
                                                               KEYER : Appears when the Built-in electronic
      :                Appears → Satellites are acquired.
                                                                       keyer is activated.
                       Blinks → Satellites cannot be ac-
                                quired.                        MONI :    Appears when the MONITOR func-
                                                                         tion is activated.
  :                    Appears when the Bluetooth func-
                       tion is activated.                      TUNE : Appears when the internal Automatic
                                                                      Antenna Tuner is activated.
                       Appears → Bluetooth device is con-
                                                                      Blinks during tuning.
                                 nected.
                       Blinks → Bluetooth device not           BK-IN : Appears when the CW Break-in func-
                                 connected.                            tion is activated.
MAIN :                 MAIN-side icon                             /     : Lights in plus (+) or negative (-) shift
                                                                          (repeater operation).
SUB :                  SUB-side icon
                                                               ANT1 / ANT2 (optima only):
VFO :                  VFO mode
                                                                       The currently selected antenna termi-
                                                                       nal is displayed.




                                                                                                              25
```


## Página 28

```text
Scope Display Setting
In addition to the conventional two-dimensional waterfall spectrum display, Yaesu has added the
3-Dimension Spectrum Stream (3DSS) color display. The constantly changing band conditions and
signals are depicted in real time and color. The frequency span is shown on the horizontal X axis,
the vertical Y axis depicts the signals and their strengths, and the time is represented on the reced-
ing Z axis. The FTX-1 operator can intuitively grasp the band and signal conditions at any instant.
• CENTER/CURSOR/FIX
Switches the Spectrum Scope operation each time the key is touched.

                                                          • When the display area is touched, the
                                                            receive frequency is moved to that point.
                                                          • In CENTER mode, the frequency
                                                            touched becomes the center.
                                                          • In CURSOR and FIX mode, the marker
                                                            and the receive frequency move to the
                                                            touched position.


• CENTER                                             • CURSOR
The receive frequency is always shown at the         Monitors the spectrum within the range set with
center of the screen and spectrum display. The       “SPAN”. When the frequency (marker) exceeds
band spectrum is shown within the range set          the upper limit or the lower limit of the range,
by “SPAN”. The CENTER mode is convenient             the screen is automatically scrolled and the
for monitoring the signal activity around the op-    status beyond the setting range can be ob-
erating frequency.                                   served.




   Marker*                                              The lower limit frequency of the display
   Current display mode (CENTER)                        area.
   Sweep Speed                                          Marker* (Receive Frequency)
   Scope Screen frequency span (display                 Marker* (Transmit Frequency)
   range).                                              Current display mode (CURSOR)
*At factory shipment, marker display is ON.             Sweep Speed
                                                        Scope Screen frequency span (display
                                                        range).
                                                        The upper limit frequency of the display
                                                        area.
                                                     *At factory shipment, marker display is ON.




26
```


## Página 29

```text
• FIX                                             • 3DSS
To use Fixed Mode, enter the start frequency of   Switch between the 3DSS display and the wa-
the scope.                                        terfall display.
                                                  The display will change each time it is touched:




                                                                       3DSS type



   Display area start frequency
   Marker* (Reception Frequency)
   Marker* (Transmit Frequency)
   Current display mode (FIX)
   Sweep Speed                                                      Waterfall type
   Scope Screen frequency span (display
   range).                                        • MULTI
   The upper limit frequency of the display       In addition to the scope display, the oscillo-
   area.                                          scope and AF-FFT are also presented.
*At factory shipment, marker display is ON.       Touch again to return to the original screen.




                                                    Touch this area to set the   Touch this area to set
                                                    level and sweep speed.       the attenuator.




                                                                                                      27
```


## Página 30

```text
• SPAN                                             • SPEED
Set the frequency span (display range) of the      Sets the Scope Display sweep speed. After
scope screen. After touching, select the desired   touching, select the desired speed.
span.




                                                   SLOW1 : sweep speed      Slow
     The display level changes when SPAN is        SLOW2 : sweep speed        ↑
     changed, so reset the optimum display         FAST1 : sweep speed     Normal
     level with [D-LEVEL] each time.               FAST2 : sweep speed        ↓
                                                   FAST3 : sweep speed      Fast
                                                   STOP : Touch [STOP] to temporarily hold the
                                                           3DSS display and waterfall display
                                                           operations. Touch [STOP] again or
                                                           another speed, to release the hold.




28
```


## Página 31

```text
• Set with the FUNC knob
Operate the [FUNC] knob to make the following settings related to the display.
D-LEVEL    : Adjust the LEVEL of the scope for the best image on the screen.
D-PEAK     : Adjust the color density with respect to the signal level on the scope screen in 5
             steps (LV1 to LV5).
D-MARKER : ON/OFF Marker indicates the transmit and receive frequency position within the
             Scope Display image.
D-COLOR    : Changes the scope screen display color from 12 types.
             Changes the font color of the frequency from 3 types.
D-CONTRAST : Adjust the TFT display contrast (difference between light and dark) in 21 steps.
DIMMER     : Adjust the TFT display brightness in 21 steps.
                                                                      FUNC knob




The last function used is retained in the [FUNC] knob so it can be easily set by operating the [FUNC]
knob. Normally, it is suggested to utilize the [FUNC] knob as the [D-LEVEL] knob for the spectrum
scope.

• LEVEL                                               • PEAK
Adjust the level to make it easier to distinguish     The color density may be adjusted to the level
between the desired signal and noise. The dis-        of the signal. Touch PEAK and then select the
play level changes depending on antenna gain,         desired color concentration.
condition, frequency band, SPAN and so on.            Press and hold the [FUNC] knob then touch
Always adjust the LEVEL for the best image on         [PEAK], and then turn the [FUNC] knob to se-
the screen.                                           lect the desired level.
Press and hold the [FUNC] knob then touch
[D-LEVEL], and then turn the [FUNC] knob to
select the desired level.




                                                      LV1    Slow
                                                      LV2      ↑
                                                      LV3   Normal
     • On the 3DSS screen, weak signals may           LV4      ↓
       be more easily observed by adjusting the       LV5    Fast
       LEVEL so that the noise level can be seen
       only a little, so always adjust the LEVEL
       and use it at the optimum position.
     • Be sure to make adjustments when
       changing bands or changing SPAN.
     • If the level is changed, the signal strength
       also appears to change, but it does not
       affect the actual signal input level.

                                                                                                 29
```


## Página 32

```text
• MARKER                                          • Adjust contrast
Displays markers that indicates the position of   Adjust the contrast of the TFT display.
the current receive and the transmit frequen-     Press and hold the [FUNC] knob then touch
cies in the spectrum.                             [D-CONTRAST], and then turn the [FUNC]
Press and hold the [FUNC] knob then touch         knob to adjust the contrast.
[MARKER] to turn the MARKER ON or OFF.
Normally leave it ON.




                                                  • Adjusting the brightness (DIMMER)
                                                  Adjust the brightness of the TFT display.
                                                  Press and hold the [FUNC] knob then touch
                                                  [DIMMER], and then turn the [FUNC] knob to
                                                  adjust the brightness.

     Receive Frequency Transmit Frequency


• COLOR
The display color of the scope screen or font
color of the frequency can be changed.
Press and hold the [FUNC] knob then touch
[COLOR], then touch the desired color from the
color selection screen.




30
```


## Página 33

```text
PMG (Primary Memory Group) for VHF/UHF
The PMG function scans up to 5 channels registered to the PMG. The receive status of each chan-
nel is simultaneously displayed in real time with a bar graph. In addition, two channels with signals
are simultaneously received, allowing convenient standby.
Operation differs between “Manual mode” and “Auto mode”.
In manual mode, transmit and receive are performed on the selected channel. If a signal is received
on another channel, it can be received at the same time.
In auto mode, when a signal is received on a scanned channel, the radio automatically switches to
the channel with the signal for transmit and receive.
If a signal is received on another channel, it can be received at the same time.
To register the currently displayed VFO or memory channel to the PMG, simply press and hold the
key on the frequency.

     The PMG feature is only available in the AIR band, 144MHz and 430MHz band.


                                          PMG Screen

                                                                              Current Frequency
                                                P2                            Channel bar


                                                                              Line under the bar graph
                                                                              White : Manual Mode
       Press the [           ]                                                Orange : Auto Mode
                                            When there is a signal,
                                            a bar graph is displayed
                                              : Receiving signal
                                              : Previously received signals Bar graph



     • If there are no registered Channels in PMG, the PMG screen will not be displayed even if the
       [PMG         ] key is pressed.
     • To adjust the squelch during PMG operation, press the MAIN-side AF/RF/SQL knob and turn
       it. The adjustment is reflected in all channels registered in PMG.
     • To adjust the volume during PMG operation, rotate the MAIN-side AF/RF/SQL knob.
     • Press and hold the [PMG           ] key to cancel the registration of the currently selected PMG
       channel.


                             Register the frequency to PMG
 • Press and hold the [PMG         ] key to register the
   current frequency in PMG.
 • Up to 5 channels can be registered in PMG.

       Up to 5 channels can be registered in PMG.
       When registering more than five Frequencies,
       older frequencies will be deleted in order from
       PMG.
                                                                       Press and the [              ]




                                                                                                    31
```


## Página 34

```text
            Unregister the Channel (Frequency) registered in PMG
 1. Select the channel (frequency) to be unregistered
    by rotating the MAIN DIAL knob.
 2. Press and hold the [PMG        ] key to cancel the
    registration.




                                                                   Press and the [                      ]



 Press and hold the [SUB DIAL] knob to switch
 between “PMG Auto Mode” and “PMG Manual
 Mode”.

                                                              Press and hold




                                         Manual Mode
 • While continuously receiving and transmitting on the PMG channel selected, if a signal is re-
   ceived on another channel, it can be received at the same time.
 • Transmission is on the selected channel.
 • Displays historical received signal strengths in gray (Disappears the signal is lost).
 • When a signal is received on another channel, the signal strength is displayed as a bar graph
   and it is simultaneously heard, but the transmit channel does not change. Turn the DIAL knob
   or touch the screen to change the transmit channel.
 Select the desired channel (e.g. P2).
                     Receive a signal on P2            Receive a signal on P4
                                                                        P2




                                                                                          P4




 Receive a signal on P2.            While listening to received   ・P2 and P4 received audio can be
 Scan P1, P3 to P5.                 audio on P2, P1 & P3 to P5     heard at the same time.
                                    are scanned.                  ・Transmission will be on P2.
                                                                  ・To transmit on P4, rotate the DIAL
                                                                   to select P4 or touch the P4 bar
                                                                   graph.
                                                                  ・When the P4 signal disappears,
                                                                   While listening to received audio
                                                                   on P2, P1 & P3 to P5 are scanned.




32
```


## Página 35

```text
                                         Auto Mode
• When a signal is received on the channels being scanned, the radio will automatically switch to
  that channel. If a signal is received on another channel, it can be received at the same time.
• When a signal disappears, scanning resumes.
• Transmission is automatically performed on the channel that received the signal.
• Displays historical received signal strengths in gray (Disappears the signal is lost).
                    Receive a signal on P4             Receive a signal on P2
                                                       P4
                                                                         P4




                                                                                P2




Receive a signal on P2.       ・The channel will automatically      ・P2 and P4 received audio can be
Scan P1, P3 to P5.             change to P4.                        heard at the same time.
                              ・While listening to received audio   ・Transmission will be on P4.
                               on P4.                              ・To transmit on P2, rotate the DIAL
                              ・P1 to P3 & P5 are scanned.           to select P2 or touch the P2 bar
                              ・Transmit will also be set to P4.     graph.




                                                                                                         33
```


## Página 36

```text
DSP interference removal functions                  ● Setting method
Press and hold the [MAIN    ] or [SUB
                                                         The following explanation describes how
] knob, then rotate the [MAIN         ] or
                                                         to set up the “MAIN” side.
[SUB       ] knob to exchanges the SHIFT,                To set up the “SUB” side, perform the
WIDTH, NOTCH, CONTOUR and APF.                           same operation using the [SUB          ]
                                                         knob.
     The “MAIN” side is set with the
     [MAIN        ] knob, and the “SUB” side is
     set with the [SUB       ] knob.                1. Press and hold the [MAIN           ] knob or
                                                       touch the spectrum area.
1. SHIFT
IF SHIFT permits moving the Digital filter pass-
band higher or lower, without changing the
pitch of the incoming signal, and thus reduce
or eliminate interference. Because the tuned
carrier frequency is not varied, there is no need
to re-tune the operating frequency to eliminate     2. Rotate the [MAIN         ] knob to select the
the interference.                                      function, then press the [MAIN       ] knob.
The total passband tuning range for the IF             (The function may also be selected by
SHIFT system is ±1.2kHz.                               touching the function name.)
2. WIDTH                                            3. Rotate the [MAIN        ] knob to set the de-
The IF WIDTH tuning system allows you to               sired value.
vary the width of the DSP IF passband, to re-       4. Press the [MAIN        ] knob to confirm the
duce or eliminate interference.                        setting.
Moreover, the bandwidth may actually be
expanded from its default setting, should you
wish to enhance incoming signal fidelity when
interference on the band is low.
3. NOTCH
The IF NOTCH filter is a highly effective system
that allows removing an interfering beat note
or other carrier signal from within the receiver
passband.
4. CONTOUR
The CONTOUR filter system provides a gen-
tle perturbation of the IF filter passband. The
CONTOUR is set to either suppress, or boost
specific frequency components, and thus en-
hances the sound and readability of a received
signal
5. APF
During CW operation, when interference or
noise is present, the center frequency is auto-
matically set to the PITCH frequency, making it
easier to hear the desired signal




34
```


## Página 37

```text
1. SHIFT                                             2. WIDTH




1. Press and hold the [MAIN          ] knob.         1. Press and hold the [MAIN             ] knob.
2. Rotate the [MAIN             ] knob to select        Rotate the [MAIN              ] knob to select
   “SHIFT”, then press the [MAIN          ] knob.       “WIDTH”, then press the [MAIN               ] knob.
   (The function may also be selected by                (The function may also be selected by
   touching “SHIFT”.)                                   touching “WIDTH”.)
3. Rotate the [MAIN          ] knob to the left or   2. Rotate the [MAIN          ] knob counter-clock-
   right to reduce interfering signals.                 wise to narrow the bandwidth and reduce
4. Press the [MAIN           ] knob to save the         interference.
   setting.                                          3. Press the [MAIN            ] knob to save the
   Press and hold the [BACK] key to quickly             setting.
   move the filter passband to center.                  Press and hold the [BACK] key to reset the
                                                        digital filter bandwidth to its initial value.
  Refer to Figure “A” and notice the de-             The default bandwidths, and total bandwidth
  piction of the IF DSP filter as a thick line       adjustment range, will vary according to the
  in the center of the passband. In Figure           operating mode (see table below).
  “B", you can see the effect of rotating the
                                                         Operating Mode               IF BANDWIDTH
  [MAIN         ] knob.
  The interference level is reduced by mov-                                           300Hz - 4000Hz
                                                      LSB / USB
  ing the filter passband so that the interfer-                                      (default: 3000Hz)
  ence is outside of the passband.                    CW-L / CW-U                     50Hz - 4000Hz
                                                      RTTY-L / RTTY-U                (default: 500Hz)
           A                        B
      Desired Signal            Desired Signal        DATA-L / DATA-U                 50Hz - 4000Hz
                                                      PSK                            (default: 3200Hz)
  QRM                       QRM                       AM                             9000Hz (Fixed)
                                                      AM-N                           6000Hz (Fixed)



    IF BANDWIDTH               IF BANDWIDTH            The figure below is a conceptual diagram
                                                       of WIDTH.




                                                                         IF BANDWIDTH




                                                                    MAIN     / SUB      knob




                                                                                                         35
```


## Página 38

```text
3. NOTCH                                                     4. CONTOUR




1. Press and hold the [MAIN            ] knob                     “CONTOUR” function does not work in
2. Rotate the [MAIN             ] knob to select                  CW-L and CW-U modes.
   “NOTCH”, then press the [MAIN                ]
   knob.                                                     1. Press and hold the [MAIN           ] knob
   (The function may also be selected by                     2. Rotate the [MAIN             ] knob to select
   touching “NOTCH”.)                                           “CONTOUR”, then press the [MAIN               ]
3. Rotate the [MAIN          ] knob to adjust the               knob.
   “null” position of the Notch filter.                         (The function may also be selected by
4. Press the [MAIN           ] knob to save the                 touching “CONTOUR”.)
   setting.                                                  3. Rotate the [MAIN         ] knob to achieve the
   Press and hold the [BACK] key to return the                  most natural-sounding audio reproduction
   center frequency to its initial value.                       of the incoming signal.
                                                             4. Press the [MAIN           ] knob to save the
         The bandwidth of the NOTCH filter                      setting.
         (either narrow or wide) may be ad-                     Press and hold the [BACK] key to return the
         justed using Menu item [OPERATION
                                                                center frequency to its initial value.
         SETTING] → [RX DSP] → [IF NOTCH
         WIDTH].
         The factory default setting is “WIDE”.                The figure below is a conceptual diagram
                                                               of CONTOUR.

  The performance of the IF Notch filter is
  shown in Figure “A", where the effect of
  rotation of the [MAIN       ] knob is depict-
  ed. In Figure “B” you can see the notching                   IF BANDWIDTH      IF BANDWIDTH          IF BANDWIDTH
  effect of the IF Notch filter as you rotate
  the [MAIN         ] knob to eliminate the in-
  coming interference.
          A                             B                                     MAIN   / SUB      knob
           Notch     QRM (Heterodyne)       Desired Signal


                                                             • Adjusting the GAIN of the
                                                              CONTOUR Circuit
                                                             1. Press and hold the [FUNC] knob.
                                                             2. Select [OPERATION SETTING] → [RX
     IF BANDWIDTH             IF BANDWIDTH
                                                                DSP] → [CONTOUR LEVEL].
                                                             3. Rotate the [FUNC] knob, or touch “<” or “>”
                                                                on either side of the value to set the CON-
                                                                TOUR circuit gain.
              MAIN   / SUB      knob                         4. Press the [FUNC] knob, or wait for about 3
                                                                seconds to save the setting.
                                                             5. Press the [BACK] key several times to re-
                                                                turn to normal operation.




36
```


## Página 39

```text
• Sets the Bandwidth (“Q”) of the                   Split
  CONTOUR Circuit                                   A powerful capability of the FTX-1 is its flexibili-
1. Press and hold the [FUNC] knob.                  ty in Split Frequency operation using the MAIN-
2. Select [OPERATION SETTING] → [RX                 side and SUB-side frequency registers. This
   DSP] → [CONTOUR WIDTH].                          makes the FTX-1 especially useful for high-lev-
3. Rotate the [FUNC] knob, or touch “<” or “>”      el DX-peditions.
   on either side of the value to set bandwidth     The Split operation capability is very advanced
   (“Q”) of the CONTOUR circuit.                    and easy to use.
4. Press the [FUNC] knob, or wait for about 3
                                                    1. To set the MAIN-side VFO frequency to the
   seconds to save the setting.
                                                       desired receive frequency.
5. Press the [BACK] key several times to re-
                                                    2. Press and hold the [           ] key, and
   turn to normal operation.
                                                       then set the SUB-side VFO frequency to the
                                                       desired transmit frequency.
5. APF
                                                    During Split operation, the MAIN-side VFO reg-
                                                    ister will be used for reception, while the SUB-
                                                    side VFO register will be used for transmission.
                                                    Press and hold the [               ] key again to
                                                    cancel Split operation.
                                                    ● During split operation, touch [TXW] after
                                                      press and hold the [FUNC] knob, to receive
                                                      the transmit frequency press the [FUNC]
     “APF” function only works in CW-L and            knob.
     CW-U modes.

1. Press and hold the [MAIN         ] knob
2. Rotate the [MAIN            ] knob to select
   “APF”, then press the [MAIN         ] knob.
   (The function may also be selected by
   touching “APF”.)
3. Rotate the [MAIN         ] knob to the left or
   right to reduce any interference.
4. Press the [MAIN          ] knob to save the
   setting.
5. Press and hold the [BACK] key to restore
   the APF peak center frequency setting to
   “0Hz”, and disable the APF function.

         The APF bandwidth can be selected
         from NARROW / MEDIUM / WIDE via
         the Menu item [OPERATION SET-
         TING] → [RX DSP] → [APF WIDTH].




                                                                                                    37
```


## Página 40

```text
  Voice Communications (SSB and AM)
When transmitting in SSB or AM mode The FTX-1 transmit audio circuit can be set to the optimum
operating level by individually adjusting the input and output gains of the microphone amplifier.

     The AMC (Automatic Microphone Gain Control) regulates the microphone audio so that dis-
     tortion does not occur, even if excessive audio is input.

1. Adjust Microphone gain                         2. Adjust the AMC gain
Touch the Meter Display and then touch “ALC”      Touch the Meter Display and then touch
to select the ALC Meter.                          “COMP” to select the COMP Meter.
1. Press and hold the [FUNC] knob.                1. Press and hold the [FUNC] knob.
2. Touch [MIC GAIN].                              2. Touch [AMC LEVEL].




3. Key TX and adjust the [FUNC] knob to set       3. Activate the transmit and speak into the mi-
   the input level of the Microphone Amplifier       crophone while adjusting the AMC level with
   to the position where the ALC Meter needle        the [FUNC] knob.
   does not exceed the ALC zone on the audio         Adjust the AMC to a point where the COMP
   peaks.                                            Meter deflection does not exceed “10dB” on
                                                     the audio peaks.
                                                     Setup is completed.




                                                        The AMC function only works in LSB,
                                                        USB, AM, AM-N, DATA-L, DATA-U and
                                                        PSK modes.
                                                        It does not work in other modes.




38
```


## Página 41

```text
Speech Processor                                   RF Power output control
The FTX-1 Speech Processor is designed to          Turn the [FUNC] knob to adjust the RF power
increase “talk power” by increasing the average    output.
power output of the transmitted SSB signal.        1. Press and hold the [FUNC] knob.
                                                   2. Touch [RF POWER].
     The speech processor function only
     works in LSB/USB mode. It does not
     work in other modes.
1. Adjust the MIC gain as described on the
   previous page.
2. Press and hold the [FUNC] knob.
3. Touch [PROC LEVEL].




                                                   3. Rotate the [FUNC] knob to adjust the RF
                                                      power.

                                                   MONITOR
                                                   Use the Monitor feature to listen to the quality
4. Touch the Meter area on the display to se-      of the transmitted signal.
   lect the “COMP” meter.                          1. Press and hold the [FUNC] knob.
5. The transmit meter becomes the “COMP”           2. Touch [MONI LEVEL].
   meter.
6. Press the PTT switch on the microphone,
   and speak into the microphone in a normal
   voice level.
7. Adjust the [FUNC] knob to set the compres-
   sion level within 10 dB.
   ● The Transmit Monitor is a helpful aid to
      verify proper adjustment of the Compres-
      sion level.
   ● The “PROC” indicator lights in the display.
Rotate the [FUNC] knob to the left to turn the
speech processor function “OFF”.                   3. Rotate the [FUNC] knob to adjust the Moni-
                                                      tor level.
     The speech processor can distort the
     transmit waveform when used to increase            Transmit audio monitor is not activate in
     the average TX power, so it is not used in         the FM, FM-N, DATA-FM, D-FM-N, AM
     normal communication.                              and AM-N modes.
                                                      ● If you are using the speaker for monitor-
                                                        ing, instead of headphones, excessive
                                                        advancement of the Monitor level can
                                                        cause feedback to occur. Additionally, this
                                                        feedback can cause the VOX system to
                                                        hang up in a loop, making it impossible
                                                        to return to receive. Therefore, we rec-
                                                        ommend the use of headphones, if at all
                                                        possible, or the minimum usable setting
                                                        of the Monitor level, if the speaker must
                                                        be used.
                                                   4. To cancel the monitor function, turn the
                                                      [FUNC] knob to set “MONI LEVEL” to “OFF”.

                                                                                               39
```


## Página 42

```text
CLAR (Clarifier)                                    • Adjust transmit frequency to the
The clarifier is used to adjust the transceiver       offset frequency
receive frequency to match the other station        After changing the receiver frequency with RX
transmit frequency and improve the audio; or to     Clarifier, the transmitter frequency can be set
shift the transmit frequency of this station when   to the same frequency as the receiver.
the transmit frequency of the contact station is    1. After offsetting the receiver frequency, press
shifted.                                                the [CLAR] key twice.
                                                        The transmit frequency becomes the same
The display will indicate “CLAR RX” → “CLAR
                                                        as the receive frequency. “CLAR RX” of the
TX” → “CLAR RXTX” in red, each time the
                                                        display changes to “CLAR RXTX”.
[CLAR] key is pressed, and the clarifier will ac-
                                                    2. Press the [CLAR] key twice, only the re-
tivate.
                                                        ceive frequency returns to the offset state.
                                                        “CLAR RXTX” of the display changes to
                                                        “CLAR RX”.
                                                    • TX Clarifier
                                                    The transmit frequency can be changed with-
                                                    out moving the receive frequency of the trans-
                                                    ceiver. Normally, the clarifier is used to move
                                                    only the receive frequency and compensate for
                                                    the deviation of the transmission frequency of
                                                    the contact station, however alternatively, only
To adjust the offset frequency of the clarifier,
                                                    the transmit frequency can be moved without
turn the “MAIN DIAL” for the MAIN-side, or the
                                                    changing the transmitter. When responding to
“SUB DIAL” for the SUB-side.
                                                    an operator that is called by a large number of
                                                    stations such as in a contest, etc.,
To turn the clarifier OFF, repeatedly press the
                                                    the response rate may increase if the transmit
[CLAR] key until the Clarifier status is not dis-
                                                    frequency is moved slightly.
played.
To clear out the programmed clarifier offset al-    1. Press the [CLAR] key twice.
together, and reset it to “zero,” press and hold    2. Rotate the MAIN dial knob to change only
the [CLAR] key.                                        the transmit frequency.

                                                         Offsets of up to ±9995Hz may be set us-
• RX Clarifier                                           ing the Clarifier.
If the transmit frequency of the contact station
deviates, this receiver clarifier frequency can     3. To cancel Clarifier operation, press the
be changed leaving this transmit frequency un-         [CLAR] key twice.
changed.                                            To clear out the programmed clarifier offset al-
1. Press the [CLAR] key.                            together, and reset it to “zero”, press and hold
2. Rotate the MAIN dial knob to change only         the [CLAR] key.
   the receive frequency.                           • To offset the frequency with the
                                                      TX Clarifier Adjust receive frequency
                                                    When the transmit frequency is offset with
                                                    the TX Clarifier, it can be reset to the same
                                                    frequency as the TX frequency offset from the
                                                    receive frequency.
                                                    1. After offsetting the transmit frequency, press
                                                       the [CLAR] key.
                                                       The receive frequency becomes the same
  When the receive frequency is offset by +20Hz.
                                                       as the transmit frequency. “CLAR TX” of the
                                                       display changes to “CLAR RXTX”.
     Offsets of up to ±9995Hz may be set us-
                                                    2. Press the [CLAR] key three times, only
     ing the Clarifier.
                                                       the transmit frequency returns to the offset
                                                       state. “CLAR RXTX” of the display changes
                                                       to “CLAR TX”.


40
```


## Página 43

```text
QRP Mode                                           DNR (Digital Noise Reduction)
Equipped with a QRP mode that allows you to        The Digital Noise Reduction (DNR) system is
set the maximum transmission output to “5W”        designed to reduce the level of ambient noise .
on all bands. This is useful for QRP contests.     The (DNR) system is especially effective during
1. Press and hold the [FUNC] knob.                 SSB operation. Any of 10 different noise-reduc-
2. Select [OPERATION SETTING] → [TX                tion algorithms can be selected; each of these
   GNRL].                                          algorithms was created to deal with a different
                                                   noise profile. You will want to experiment with
                                                   the DNR system to find the best setting corre-
                                                   sponding to the noise currently being experi-
                                                   enced.
                                                   The DNR function can be operated individually
                                                   for MAIN-side and SUB-side.
                                                   1. Press and hold the [FUNC] knob.
                                                   2. Touch [DNR].




3. Rotate the [FUNC] knob to select [QRP
   MODE].
4. Rotate the [FUNC] knob, or touch “<” or “>”
   on either side of the value to select “ON” or
   “OFF”.
5. Press the [FUNC] knob, or wait for about 3
   seconds to save the setting.                    3. Rotate the [FUNC] knob to adjust the DNR
                                                      level.
                                                      The “DNR” indicator lights in the display.
                                                   4. Rotate the [FUNC] knob to the left to turn
                                                      the DNR function “OFF”.




                                                                                              41
```


## Página 44

```text
Voice Memory
The Voice Memory capability of the FTX-1 may be used to store and replay often repeated mes-
sages. The Voice Memory includes five memories.

     When performing Voice memory, a commercially available microSD card is necessary.


• Recording Your Own Voice in Memory                • Transmitting the Recorded Message
1. Insert a commercially available microSD          1. Select the LSB, USB, AM, AM-N, FM or
   memory card into the SD card slot on the            FM-N mode.
   left side of the transceiver.                    2. Press and hold the [FUNC] knob.
2. Select the LSB, USB, AM, AM-N, FM or             3. Touch [BK-IN] to turn ON the BK-IN func-
   FM-N mode.                                          tion.
3. Press and hold the [FUNC] knob.                  4. Touch [MESSAGE] .
4. Touch [MESSAGE].                                 5. Touch [1] through [5] on the display (which-
   The “MESSAGE MEMORY” screen will be                 ever memory was recorded in). A “MSG”
   displayed.                                          icon will appear in the display and the mes-
5. Touch [MEM] on the display.                         sage will be transmitted.
   A blinking “REC” will appear in the display.        ● To adjust the output level during transmit,
6. Touch [1] through [5] on the display to select         touch [TX LEVEL] and turn the [FUNC]
   that memory storage register.                          knob.
7. Press the microphone PTT switch momen-
   tarily.
   The “REC” icon will glow steadily and re-
   cording will begin.
   ● “REC” lights up on the display while re-
      cording is in progress.
   ● Remember that the time limit for recording
      any message is 90 seconds.
8. Release the PTT switch to complete the
   message storage process.
• Checking the Recording
1. Press and hold the [FUNC] knob.
2. Touch [BK-IN] to turn OFF the BK-IN func-
   tion.
3. Touch [MESSAGE].
   The “MESSAGE MEMORY” screen will be
   displayed.
4. Touch [1] through [5] on the display (which-
   ever register was just recorded in). The
   “MSG” icon will appear in the display and
   the audio recorded in the Voice Memory will
   be heard.
   ● To adjust the playback volume level, turn
      the [FUNC] knob or touch [RX LEVEL]
      when not playing, and then turn the
      [FUNC] knob to adjust.




42
```


## Página 45

```text
Record the received audio
You can record and play the received audio on the microSD memory card.
Record and play of the received audio may be operated from the Display Panel.

     • Only audio from the MAIN side will be recorded. The SUB side audio cannot be recorded.
     • When performing record and play of the received audio, a commercially available microSD
       card is necessary.
     • The maximum recording time for one file is about 16 hours. (Maximum file size limit approx.
       3.5GB) Recording stops automatically when the maximum file size limit is exceeded.
     • Audio files other than those recorded by this unit cannot be played.

• Recording the received audio                     5. Rotate the [FUNC] knob during playback to
1. Insert a commercially available microSD            adjust the volume.
   memory card into the SD card slot on the           You can also adjust the volume by touching
   left side of the transceiver.                      [RX LEVEL] and turning the [FUNC] knob
2. Press and hold the [FUNC] knob.                    when not playing.
3. Touch [RECORD].                                                       Playback elapsed time
   A “S.REC” icon will blink and recording will           Advance for 5 seconds
   begin.                                               Back for 5 seconds
   The recording time depends on the capacity                        pause               Volume
   of the SD memory card used.
4. Touch [STOP] to end recording.
   “S.REC” on the display turns OFF.
• Play the recorded content
1. Press and hold the [FUNC] knob.
2. Touch [PLAY].
   The “PLAY LIST” screen will be displayed.
3. Rotate the [FUNC] knob to select the file
   name you want to play.
   You can also select it by touching [ꞁ◄◄] or
   [►►ꞁ ].
4. Touch [►] to start playback.                    6. Touch [BACK] to return to normal operation.
                Selected file name                 • Erase the recorded content
     Recorded time             Start playback      1. Press and hold the [FUNC] knob.
                                                   2. Touch [PLAY].
                                                      The “PLAY LIST” screen will be displayed.
                                                   3. Rotate the [FUNC] knob to select the file
                                                      name you want to delete.
                                                   4. Touch [DELETE].
                                                   5. Touch [OK] to delete it.




       File name    Frequency     Mode




                                                                                              43
```


## Página 46

```text
Using the Automatic Antenna Tuner (FTX-1 optima only)
The Automatic Antenna Tuner (ATU) is built into each FTX-1 optima. The ATU is designed to ensure
that a 50-Ohm antenna impedance load is presented to the final amplifier stage of the transmitter.
       • Because the FTX-1 optima ATU is located inside transceiver, it can only adjust the imped-
         ance presented to the transceiver end of the coaxial cable feedline. It does not “tune” the
         SWR at the antenna feed point itself.
       • When designing and building an antenna system, we recommend that every effort be made
         to also ensure a low SWR at the antenna feed point.
       • The ATU in the FTX-1 optima is designed to match impedances within the range of 16.7
         Ohms to 150 Ohms, corresponding to an SWR of 3:1 or less on the HF amateur bands (6
         m amateur band: 25 Ohms to 100 Ohms, corresponding to an SWR of 2:1 or less). Accord-
         ingly, simple non-resonant whip antennas, along with random-length wires and the “G5RV”
         antenna (on most bands) may not be within the impedance matching range of the ATU.
       • The built-in antenna tuner cannot be used with an antenna connector connected to an exter-
         nal antenna tuner.


• ATU Operation
                                                                 About ATU Memories
1. Press and hold the [FUNC] knob.
2. Touch [TUNER] to place the ATU in the              SWR (After tuning) Less than 2:1
   transmit line (no adjustment or tuning will        The tuner settings are stored in the ATU
   occur yet).                                        memory.
   While the ATU function is activated, the           SWR (After tuning) Greater than 2:1
   “TUNE” will be displayed.                          Tuning data will not be retained in memory.
3. Touch [ANT TUNE] key to begin automatic            If operation is returned to the same frequen-
   tuning.                                            cy, the tuning process must be repeated.
     The transmitter will be engaged, and “TUNE”
                                                      SWR (After tuning) Greater than 3:1
     will be blinks while tuning is in progress.
                                                      The “HI-SWR” icon will light up, and the
     ● Always listen on the operating frequen-
                                                      tuner settings, if achieved, will not be mem-
        cy before beginning the tuning process,
                                                      orized.
        to be sure tuning will not interfere with
                                                      Investigate the high SWR condition and re-
        others who may already be using the fre-
                                                      solve the problem before attempting further
        quency.
                                                      operation using this antenna.
     ● When the optimum tuning point has been
        achieved, the transceiver will return to
        receive.
     ● It is normal to hear the sound of the re-
        lays while tuning is in progress.
4. To disengage the ATU from the transmit
   line, touch [TUNE].




44
```


## Página 47

```text
       For additional details on the following Functions, refer to the Advanced Manual which may
       be downloaded from the Yaesu website.

Tone squelch feature
The tone squelch opens the speaker audio only when a signal containing the specified CTCSS
tone is received. By matching the CTCSS tone frequency with the partner stations, quiet standby
monitoring is possible.
DCS (Digital Code squelch) feature
The DCS (Digital Coded Squelch) function allows audio to be heard only when signals containing
the same DCS code are received.
DG-ID (Digital Group ID) feature
Digital Group ID (DG-ID) function allows using the two-digit ID numbers to communicate only with
specific group members.
DP-ID (Digital Personal ID) feature
DP-ID (Digital Personal ID) feature opens the speaker audio only when a C4FM signal set to the
same DP-ID in the Digital Mode is received.
Parametric Microphone Equalizer
The FTX-1 includes a unique Three-Band Parametric Microphone Equalizer that provides precise,
in- dependent control over the low, mid and treble ranges in the voice waveform. One group of set-
tings may be utilized when the Speech Processor is Off, and an alternate group of settings when
the Speech Processor is On (SSB mode only).
Adjustable Receiver Audio Filter
The FTX-1 incorporates an adjustable receiver audio filter, that affords precision control of the lower
and upper audio ranges independently.
Change the sound quality of the received audio
You can change each of the high, mid, and low frequencies of the received audio to your liking. It
can be set for each mode.




                                                                                                   45
```


## Página 48

```text
  CW Mode Operation
The impressive CW operating capabilities of the FTX-1 permit operating with an Electronic Keyer
Paddle, a “Straight Key”, or a computer based keying device.

1. Before starting, connect the key cable to the   Adjusting the Sidetone Audio level
   left side panel KEY jack.
                                                   The CW sidetone audio level may be adjusted
2. Set the operating mode to CW-U.
                                                   by press and hold the [FUNC] knob, then touch
   The normal “CW” mode utilizes USB-side
                                                   [MONI LEVEL], and then rotating the [FUNC]
   carrier injection.
                                                   knob.
3. Press and hold the [FUNC] knob.
                                                   CW Spotting (Zero-Beating)
                                                   “Spotting” (zeroing in on another CW station)
                                                   is a handy technique to ensure the transceiver
                                                   and the other station are operating precisely on
                                                   the same frequency.
                                                   The Tuning Offset Indicator in the display may
                                                   also be moved to adjust the receiver frequency
                                                   to center on the incoming station with the CW
                                                   pitch corresponding to that of the transmit sig-
                                                   nal.




                                                   Turn OFF the Tuning Offset Indicator using
4. Touch [BK-IN] to turn ON the BK-IN func-        Menu item “CW INDICATOR”.
   tion.                                           1. Press and hold the [FUNC] knob.
5. Touch [MONI LEVEL] and then turn the            2. Select [CW SETTING] → [MODE CW].
   [FUNC] knob to adjust the volume of the         3. Rotate the [FUNC] knob to select [CW INDI-
   monitor.                                           CATOR].
6. When using the keyer paddle, press and          4. Rotate the [FUNC] knob, or touch “<” or “>”
   hold the [FUNC] knob and then touch                on either side of the value to select “ON” or
   [KEYER] to turn ON the Electronic Keyer.           “OFF”.
7. When the key or the keyer paddle is             5. Press the [FUNC] knob, or wait for about 3
   pressed, the transmitter will automatically        seconds to save the setting.
   be engaged.
                                                   • ZIN
As shipped from the factory, the FTX-1 CW TX/      1. Press and hold the [FUNC] knob.
RX is configured for “Semibreak-in” operation.     2. Touch [ZIN] to cause the receiving frequen-
However, using Menu item “CW BK-IN TYPE”,             cy to zero-in automatically while receiving
this setup may be changed to full break-in            the CW signal.
(QSK) operation, wherein the switching is quick    • SPOT
enough to hear incoming signals in the spaces
                                                   1. Press and hold the [FUNC] knob.
between the dots and dashes of the transmis-
                                                   2. Touch [CW SPOT].
sion. This may prove very useful during contest
                                                   3. While you are pressing and holding the
and traffic handling operations.
                                                      [FUNC] knob, the tone is output from the
                                                      speaker.
                                                      ● The Spot tone audio level may be adjust-
                                                        ed by press and hold the [FUNC] knob,
                                                        then touching [MONI LEVEL], and rotat-
                                                        ing the [FUNC] knob.


46
```


## Página 49

```text
CW Delay Time Setting                               • Selecting the Keyer Operating Mode
During semi-break-in (not QSK) operation, the       The configuration of the Electronic Keyer may
hang time of TX, after the transmitting ends        be customized for the FTX-1. This permits utili-
may be adjusted to a comfortable value corre-       zation of Automatic Character Spacing (ACS),
sponding with the sending speed.                    if desired.
1. Press and hold the [FUNC] knob.                  1. Press and hold the [FUNC] knob.
2. Touch [BK-DELAY].                                2. Select [CW SETTING]→[KEYER].
3. Rotate the [FUNC] knob to adjust the hang        3. Select [KEYER TYPE].
   time for comfortable operation.                  4. Rotate the [FUNC] knob, or touch “<” or “>”
4. Press and hold the [FUNC] knob to save              on either side of the value to set the keyer
   the setting.                                        to the desired operating mode, see the table
                                                       below.
Setting of the Electronic Keyer                     5. Press the [FUNC] knob, or wait for about 3
• Adjusting the Keyer Speed                            seconds to save the setting.
Keyer speed can be adjusted by rotating the         6. Press the [BACK] key several times to
[FUNC] knob.                                           return to normal operation.
Press [FUNC], then touch [CW SPEED], and
                                                     OFF         The built-in Electronic Keyer is turned
rotate the [FUNC] knob to set the desired
                                                                 OFF ("straight key” mode).
sending speed (4 wpm - 60 wpm).
• Setting the Keyer Weight (Dot/Dash) Ratio          BUG         Dots will be generated automatically
                                                                 by the keyer, but dashes must be
This Menu item may be used to adjust the dot/
                                                                 sent manually.
dash ratio for the built-in Electronic Keyer. The
default weighting is 3:0 (a dash is three times      ELEKEY-A    A code element (“Dot” or “Dash” side)
longer than a dot).                                              is transmitted upon releasing both
1. Press and hold the [FUNC] knob.                               sides of the paddle.
2. Select [CW SETTING]→[KEYER]→[CW
                                                     ELEKEY-B    Releasing both sides of the paddle
   WEIGHT].                                                      transmits the currently generated
3. Rotate the [FUNC] knob, or touch “<” or “>”                   “Dash” side followed by “Dot” side (or
   on either side of the value to set the weight                 reverse order).
   to the desired value. The available adjust-
   ment range is a Dot/Dash ratio of 2.5 - 4.5       ELEKEY-Y    Pressing both sides of the paddle
   (default value: 3.0).                                         transmits the currently generated
4. Press the [FUNC] knob, or wait for about 3                    “Dash” side followed by “Dot” side (or
   seconds to save the setting.                                  reverse order).
5. Press the [BACK] key several times to                         While transmitting the “Dash” side,
   return to normal operation.                                   the first transmitted “Dot” side will not
                                                                 be stored.
• Reversing the Keyer Polarity
The Keyer polarity can be reversed easily in         ACS         Same as “ELEKEY” except that
the Menu mode without changing the keyer                         the spacing between characters is
                                                                 precisely set by the keyer to be the
connections (the default setting is “NOR”).
                                                                 same length as a dash (three dots in
Example: for left-handed operators in a contest.
                                                                 length).
     In the Keyer modes described on the                         ACS
                                                                 OFF Morse
     chart at the right, BUG and OFF modes
                                                                      “E” & “T”
     are not changed.
                                                                                  Inter-character
                                                                                  Spacing too short
1. Press and hold the [FUNC] knob.                               ACS
2. Select [CW SETTING] → [KEYER].                                ON Morse
                                                                     “E” & “T”
3. Select [KEYER DOT/DASH].
4. Rotate the [FUNC] knob, or touch “<” or “>”
   on either side of the value to set the “REV”.
5. Press the [FUNC] knob, or wait for about 3
   seconds to save the setting.
6. Press the [BACK] key several times to
   return to normal operation.

                                                                                                       47
```


## Página 50

```text
Contest Memory Keyer
The CW message capability of the FTX-1 may be controlled either from the Transceiver Front Panel.
• Message Memory
Five CW memory channels capable of retaining 50 characters each are available (using the PARIS
standard for characters and word length).
Example: CQ CQ CQ DE W6DXC K (19 characters)
-- • -- •     -- -- • --   -- • -- •   -- -- • --   -- • -- •   -- -- • --   -- • •    •     • -- --   -- • • • •   -- • •   -- • • --   -- • -- •   -- • --
   C             Q            C           Q            C           Q          D       E       W           6          D          X           C          K

• Storing a Message into Memory                                                       • Checking the CW Memory Contents
1. Press and hold the [FUNC] knob.                                                    1. Press and hold the [FUNC] knob.
2. Select [CW SETTING] →[KEYER].                                                      2. Touch [BK-IN] to turn it “OFF”.
3. Select the CW Memory Register (“CW                                                 3. Touch [MONI LEVEL] and then turn the
   MEMORY 1” to “CW MEMORY 5”) into                                                      [FUNC] knob to adjust the volume of the
   which the message is to be stored; for now,                                           monitor.
   the message entry technique is being set to                                        4. Press and hold the [FUNC] knob.
   “Keyer Entry” for the selected CW Memory                                           5. Touch [MESSAGE].
   register.                                                                             The “MESSAGE MEMORY” screen will be
4. Set the selected CW Memory Register to                                                displayed.
   “MESSAGE”. To use the Keyer Paddle for                                             6. Touch [1] - [5] on the display, whichever
   message entry on all the memories, set all                                            memory was just recorded. The message
   five Menu items to “MESSAGE”.                                                         will be played and heard in the sidetone
5. Press the [FUNC] knob, or wait for about 3                                            monitor, but no RF energy will be transmit-
   seconds to save the setting.                                                          ted.
6. Press the [BACK] key several times to re-                                             ● The “MSG” will appear in the display.
   turn to normal operation.
                                                                                      • On-The-Air CW Message Playback
• Message Memory Programming                                                          1. Press and hold the [FUNC] knob.
  (Using your Paddle)                                                                 2. Touch [BK-IN] to turn it “ON”.
1. Set the operating mode to CW.                                                      3. Touch [MESSAGE].
2. Press and hold the [FUNC] knob.                                                       The “MESSAGE MEMORY” screen will be
3. Touch [BK-IN] to turn it “OFF”.                                                       displayed.
4. Touch [KEYER] to turn it “ON”.                                                     4. Touch [1] - [5] on the display to transmit the
   The built-in Electronic Keyer is activated.                                           recorded CW Memory Register message.
5. Touch [MESSAGE] .                                                                     The programmed message will be transmit-
   The “MESSAGE MEMORY” screen will be                                                   ted on the air.
   displayed.                                                                            ● During a transmission, the same key may
6. Touch [MEM] on the display.                                                              be pressed again to immediately end the
   A blinking “REC” will appear in the display.                                             transmission.
7. Touch [1] through [5] on the display to select
   that memory storage register.
                                                                                            Transmitting in the Beacon Mode
   ● The “REC” will glow steadily.
8. Send the desired CW message using the                                               In “Beacon” mode, any programmed mes-
   keyer paddle.                                                                       sage, (either via Paddle, or via “Text” input
9. Touch [MEM] on the display to end mes-                                              method) may be repeatedly transmitted.
   sage recording.                                                                     The time delay between message repeats
                                                                                       may be set from 1 to 60 seconds, in one
            Care must be exercised in sending to                                       second steps, via Menu item “REPEAT IN-
            ensure the spaces between letters and                                      TERVAL”.
            words are accurately applied.                                              To transmit the message:
            If the timing is off, the spacing may not be                               1. Touch and hold [1] - [5] on the display.
            correct in the stored message. For ease
                                                                                           Repetitive transmission of the Beacon
            in setting up the keyer memories, we
                                                                                           message will begin.
            recommend setting Menu item “KEYER
            TYPE” to “ACS” (Automatic Character                                        2. Press the same key again to cancel the
            Spacing) while programming the keyer                                           Beacon Mode.
            memories.

48
```


## Página 51

```text
Text Memory
The five channels of CW message memory (up to 50 characters each) may also be programmed
using a text-entry technique.
This technique is somewhat slower than sending the message directly from the keyer paddle, but
accuracy of character spacing is ensured. Be sure to enter the character “}” at the end of the text
message.
Example 1: CQ CQ CQ DE W6DXC K} (20 characters)
The sequential Contest Number (“Count up”) feature is another impressive feature of the CW Mem-
ory Keyer.
Example 2: 599 10 200 # K} (15 characters)
• Text Memory Storage                               • Checking the CW Memory Contents
1. Press and hold the [FUNC] knob.                  1. Set the operating mode to CW.
2. Select [CW SETTING] →[KEYER].                    2. Press and hold the [FUNC] knob.
3. Select the CW Memory Register (“CW               3. Touch [BK-IN] to turn it “OFF”.
   MEMORY 1” to “CW MEMORY 5”) into                 4. Touch [MONI LEVEL] and then turn the
   which a message is to be stored. For now,           [FUNC] knob to adjust the volume of the
   the message entry technique is being set            monitor.
   to (Text entry) for the selected CW Memory       5. Press and hold the [FUNC] knob.
   Register.                                        6. Touch [MESSAGE].
4. If Text Message entry is to be used for all         The “MESSAGE MEMORY” screen will be
   five memories, set all five CW Memory Reg-          displayed.
   ister Menu items to “TEXT”.                      7. Touch [1] - [5] on the display, whichever
5. Press the [FUNC] knob, or wait for about 3          memory that was recorded in. The message
   seconds to save the setting.                        will be played, and heard in the sidetone
6. Press the [BACK] key several times to               monitor, but no RF energy will be transmit-
   return to normal operation.                         ted.
                                                       ● “MSG” will appear in the display.
• Text Message Programming
1. Set the operating mode to CW.                    • On-The-Air CW Message Playback
2. Press and hold the [FUNC] knob.                  1. Set the operating mode to CW.
3. Touch [MESSAGE].                                 2. Press and hold the [FUNC] knob.
   The “MESSAGE MEMORY” screen will be              3. Touch [BK-IN] to turn it “ON”.
   displayed.                                       4. Touch [MESSAGE].
4. Touch [MEM] on the display.                         The “MESSAGE MEMORY” screen will be
5. Touch [1] through [5] on the display to select      displayed.
   that memory storage register.                    5. Touch [1] - [5] on the display, depending on
   The text input screen will appear.                  the CW Memory Register message to be
                                                       transmitted.
     The following texts are programmed to             The programmed message will be transmit-
     MEMORY 4 and MEMORY 5 in factory                  ted on the air.
     default.                                          ● During transmit, press the same key
     MEMORY 4: DE FTX-1 K}                                again, to immediately cancel the trans-
     MEMORY 5: R 5NN K}                                   mission.
6. Touch the character keys on the display to
   enter the letters, numbers, or symbols of
   the desired label. Use the “#” character to
   designate the position where the Contest
   Number will appear.
7. When the text entry is completed, touch
   [ENT].
8. When all the characters have been pro-
   grammed, touch [BACK] to exit.


                                                                                               49
```


## Página 52

```text
                                    Contest Number
 If “#” is entered in the CW message, the contest number will automatically increment (count
 up) each time the message is sent. See below to set the contest number.
 Contest Number Programming
 1. Press and hold the [FUNC] knob.
 2. Select [CW SETTING] → [KEYER] → [CONTEST NUMBER].
 3. Rotate the [FUNC] knob, or touch “<” or “>” on either side of the value to set the Contest
    Number to the desired value.
 4. Press the [FUNC] knob, or wait for about 3 seconds to save the setting.
 5. Press the [BACK] key several times to return to normal operation.

 Decrementing the Contest Number
 Use this process if the current contest number gets ahead of the actual number. For example:
 in case of a duplicate QSO,).
 Touch [DECnnnn] on “MESSAGE MEMORY” screen. The current Contest Number will be re-
 duced by one. If you go too far, use the “Contest Number Programming” technique described
 above.




50
```


## Página 53

```text
                                         FM / C4FM Mode Operation
Selecting the Communication Mode                      Repeater Operation
• Using AMS (Automatic Mode Select)                   1. Set the operating mode to FM.
                                                      2. Set to the desired repeater output frequency
  function for VHF/UHF
                                                          (downlink from the repeater).
The FTX-1 transceiver is equipped with the            3. Press and hold the [FUNC] knob.
AMS (Automatic Mode Select) function which            4. Select [RADIO SETTING] → [MODE FM] →
automatically selects the communication mode              [RPT SHIFT].
corresponding to the received signal.                 5. Rotate the [FUNC] knob, or touch “<” or “>”
To utilize the AMS function.                              on either side of the value to select the de-
1. Press and hold the [N/W         ] key.                 sired repeater shift direction. The selections
   The operation mode selection screen ap-                are:
   pears on the display.                                  “–” → “SIMP” → “+” → “ARS”
2. Touch [AMS].                                           ● To program the proper repeater shift, use
   When a signal is received, the communica-                 Menu items “RPT SHIFT(28MHz)”, “RPT
   tion mode is automatically switched and the               SHIFT(50MHz)”, “RPT SHIFT(144MHz)”
   communication mode display changes.                       and “RPT SHIFT(430MHz)” as appropri-
                                                             ate.
                                                      6. Rotate the [FUNC] knob to select [SQL
                                                          TYPE].
                                                      7. Rotate the [FUNC] knob, or touch “<” or “>”
                                                          on either side of the value to select “ENC”.
                                                      8. Rotate the [FUNC] knob to select [TONE
                                                          FREQ].
                                                      9. Rotate the [FUNC] knob, or touch “<” or
                                                          “>” on either side of the value to select the
• Fixing the Communication Mode
                                                          desired CTCSS Tone to be used. A total of
1. Press and hold the [N/W     ] key.                     50 standard CTCSS tones are provided (see
   The operation mode selection screen ap-                the CTCSS Tone Chart).
   pears on the display.                              10.Press the [FUNC] knob, or wait for about 3
2. Touch [FM], [C4FM] or [VW].                            seconds to save the setting.
                                                      11. Press the [BACK] key several times to
                                                          return to normal operation.
                                                      Press and hold the microphone PTT switch to
                                                      begin transmitting.
                                                                  CTCSS Tone Frequency (Hz)
                                                       67.0    69.3 71.9 74.4 77.0 79.7          82.5
                                                       85.4    88.5 91.5 94.8 97.4 100.0         103.5
Communication Mode      Icon Description of Modes      107.2   110.9 114.8 118.8 123.0 127.3     131.8
                             This is the standard      136.5   141.3 146.2 151.4 156.7 159.8     162.2
                             digital mode.             165.5   167.9 171.3 173.8 177.3 179.9     183.5
       V/D mode              Calls are less prone
                                                       186.2   189.9 192.8 196.6 199.5 203.5     206.5
  (Voice & Data are          to interruptions
                       C4FM                            210.7   218.1 225.7 229.1 233.6 241.8     250.3
      transmitted            caused by detection
   simultaneously)           and correction of the     254.1     -     -      -     -      -       -
                             received digital voice
                             signal.                  • Tone Calling (1750 Hz)
                             High speed data
                             communication using
                                                      1. Press and hold the [FUNC] knob.
    Voice FR mode            entire 12.5 kHz          2. Touch [T-CALL] to generates a 1750 Hz
                        VW                               burst tone to access the European repeater.
(Voice Full Rate Mode)       band. Enables
                             high-quality voice       3. Once access to the repeater has been
                             communication.              gained, you may touch [T-CALL] again, and
                             Analog communica-           use the PTT switch for activating the trans-
       FM mode           FM
                             tion using FM mode.         mitter thereafter.

                                                                                                    51
```


## Página 54

```text
  DATA (FT8 / RTTY / PSK) Operation
The transceiver and a PC may be connected with a commercially available USB cable (Type-C) to
operate data communications using commercially available software and freeware.
Before connecting a RTTY communications TU (Terminal unit) or DATA Communications Device to
the transceiver, also refer to the instruction manual of the connected device.
Connecting to a Personal Computer
     To connect to a PC using a USB cable, a Virtual COM port driver must be installed on the PC.
     Visit the Yaesu website http://www.yaesu.com/ to download the Virtual COM port driver and
     Installation Manual.




                                   To USB port



                                Commercially available
                                USB Type-C (A-C) cable


FT8 Operation
The multiple settings required for FT8 operation may be set with one touch of [PRESET]. In addi-
tion, the FT8 settings can be returned to the prior settings with one touch.
1. Touch the operation mode area, or press           Touch [PRESET] or select [PRESET] via the
   and hold the [N/W     ] key.                      [FUNC] knob, the settings will be confirmed
                                                     and then the operating screen will return.




                                                  3. Touch [PRESET] again, the [PRESET] set-
                                                     tings are canceled and the original settings
                                                     are restored.
                                                  The color of the [PRESET] shows the current
                                                  state.
                                                  Blue: Enable the [PRESET] settings
                                                  Gray: Disable the [PRESET] settings


2. The operation MODE selection screen ap-
   pears on the display, then touch [PRESET],
   or rotate the [FUNC] knob to select [PRE-
   SET] then press the [FUNC] knob.

52
```


## Página 55

```text
• Change the [PRESET] setting
Five channels of the 15 listed in the table below are registered in [PRESET]. These settings may be
changed as needed.
          Function                                Available Settings (Default: Bold)
 CAT-1 RATE                    4800bps / 9600bps / 19200bps / 38400bps / 115200bps
 CAT-1 TIME OUT TIMER          10msec / 100msec / 1000msec / 3000msec
 CAT-1 CAT-3 STOP BIT          1bit / 2bit
 AGC FAST DELAY                20msec - 160msec - 4000msec (20msec/step)
 AGC MID DELAY                 20msec - 500msec - 4000msec (20msec/step)
 AGC SLOW DELAY                20msec - 1500msec - 4000msec (20msec/step)
 LCUT FREQ                     OFF / 100Hz - 1000Hz (50Hz/step)
 LCUT SLOPE                    6dB/oct / 18dB/oct
 HCUT FREQ                     OFF / 700Hz - 3200Hz - 4000Hz (50Hz/step)
 HCUT SLOPE                    6dB/oct / 18dB/oct
 USB OUT LEVEL                 0 - 50 - 100
 TX BPF SEL                    50-3050Hz / 100-2900Hz / 200-2800Hz / 300-2700Hz / 400-2600Hz
 MOD SOURCE                    MIC / USB / Bluetooth / AUTO
 USB MOD GAIN                  0 - 50 - 100
 RPTT SELECT                   OFF / RTS / DTR

1. Touch and hold [PRESET], the operation
   mode selection screen appears on the dis-
   play.
2. Touch the PRESET 1 to 5 settings to be
   changed.
3. Touch the desired item, or rotate the [FUNC]
   knob to select the desired item, then press
   the [FUNC] knob.
4. Rotate the [FUNC] knob, or touch “<” or “>”
   on either side of the value setting that is to
   be changed.
5. Press the [FUNC] knob, or wait for about 3
   seconds to save the setting.
6. Press the [BACK] key twice to return to the
   operation MODE selection screen. After
   about 5 seconds, the operation screen will
   return.




                                                                                               53
```


## Página 56

```text
RTTY Operation
1. Before operating with RTTY, set the Menu items in the chart to the below.

           Setting Menu                          Available Values (Bold is the default)

     RADIO SETTING                OFF        Not available
      → MODE RTTY                            Controls the RTTY transmit signal from the USB virtual COM/
       → RPTT SELECT            RTS/DTR
                                             RTS or DTR ports.

     RADIO SETTING
                                 1275Hz
      → MODE RTTY                            Normally use at 2125 Hz.
                                 2125Hz
       → MARK FREQUENCY

                                 170Hz
     RADIO SETTING
                                 200Hz
      → MODE RTTY                            Normally use at 170 Hz.
                                 425Hz
       → SHIFT FREQUENCY
                                 850Hz
                                             The shift direction of the RTTY transmit space frequency will
     RADIO SETTING                NOR
                                             be lower than the mark frequency.
      → MODE RTTY
       → POLARITY TX                         The shift direction of the RTTY transmit mark frequency will
                                  REV
                                             be lower than the space frequency.

2. Set the operating mode to RTTY-L.

     Generally, amateur band stations operate RTTY in LSB.

Align the peak of the received signal with the mark frequency and shift frequency marker of the TFT
screen.

PSK Operation
1. For PSK operation, set the Menu items as indicated in the below chart.

           Setting Menu                          Available Values (Bold is the default)

                                    MIC      Audio is input from the MIC jack.
                                    USB      Audio/Data is input from the USB jack.
                                 Bluetooth   Audio/Data is input from the Bluetooth.
     RADIO SETTING                           Modulation is automatically selected according to the trans-
      → MODE DATA                            mission method.
       → MOD SOURCE                          PTT:    The MIC jack on the front panel.
                                             MOX: The MIC jack on the front panel.
                                  AUTO
                                             CAT:    The USB jack on the front panel.
                                             RTS:    The USB jack on the front panel.
                                             DTR:    The USB jack on the front panel.
                                             VOX: Terminal set with “VOX SELECT”.

     RADIO SETTING                  OFF      Not available
      → MODE DATA                            Controls the DATA transmit signal from the USB virtual
       → RPTT SELECT            RTS/DTR
                                             COM/RTS or DTR ports.

2. Set the operating mode to PSK.

     Set the operation mode of the data communication software application on the PC to “DATA-U”.

Align the peak of the received signal with the mark frequency and shift frequency marker of the TFT
screen.



54
```


## Página 57

```text
                                                         Memory Operation
                                                    Recall a Memory Channel other
                                                    than the last used VFO frequency
                                                    Rotate the MAIN DIAL/SUB DIAL knob
                                                    to select a memory
                                                    1. Press the [V/M      ] key.
                                                    2. Rotate the MAIN DIAL/SUB DIAL knob, to
                                                       select the desired memory channel.
   V/M                                              Touch the display to select a memory
This key toggles frequency control between          1. Press and hold the [V/M       ] key.
VFO and the memory system.                             The memory channel list will be displayed.
Memory Storage
1. Set the frequency, mode, and status, as
   desired.
2. Press and hold the [V/M       ] key.
   The memory channel list will be displayed.
3. From the channel list, touch and select the
   desired memory channel Alternately, the          2. From the channel list, touch and select the
   memory channel may be selected by rotat-            desired memory channel.
   ing the [FUNC] knob.                                Alternately, the memory channel may be
                                                       selected by rotating the [FUNC] knob.
                                                    3. Press the [FUNC] knob.
                                                    4. To exit from memory mode and return to the
                                                       VFO mode, press the [V/M        ] key.

                                                       M►V
                                                    • Moving Memory Data to the VFO register
4. Press and hold the [V/M        ] key to store    The contents of the currently selected Memory
   the frequency and other data into the se-        Channel may be transferred into the VFO reg-
   lected memory channel.                           ister:
   ● This method may also be used to over-          1. Press and hold the [V/M            ] key while
      write the contents previously stored to a         operating in either VFO mode, or memory
      memory channel.                                   channel mode.
5. Touch [BACK], the memory is stored and               The memory channel list will be displayed.
   the screen returns to normal.                    2. From the channel list, touch the memory
                                                        channel to select it and transfer it to the
     The information saved in the memory                VFO.
     may be lost due to incorrect operation,            Alternately, the memory channel may be
     static electricity or electrical noise. Data       selected by rotating the [FUNC] knob.
     may also be lost due to component fail-        3. Press the [M►V          ] key, the data in the
     ures and repairs.
                                                        selected memory channel will now be trans-
     Make sure to write down the information
                                                        ferred to the VFO.
     registered in the memories on a piece of
     paper or by using a microSD card.




                                                                                                 55
```


## Página 58

```text
• Transfer last used memory to VFO
When in VFO mode, the last used VFO memo-
ry may be copied to VFO.
Press the [M►V       ] key, copy to the VFO.
The memory last used by MAIN-side is copied
to MAIN-side VFO, and the memory last used
by SUB-side is copied to SUB-side VFO.

• Memory Tune Operation
You may freely tune off from any memory chan-
nel in a “Memory Tune” mode, this is similar
to VFO operation. So long as you do not over-
write the contents of the current memory, Mem-
ory Tune operation will not alter the contents of
the memory channel.
1. When in memory mode, press and hold the
   [M►V       ] key.
   ● The “MT” notation will appear instead of
      the “M-nnn”.
2. Rotate the MAIN DIAL/SUB DIAL knob; you
   will now observe that the memory channel
   frequency is changing.
3. Press the [M►V       ] key to return to the
   originally memorized frequency of the cur-
   rent memory channel.




56
```


## Página 59

```text
Recall only memories in the same frequency band (Band) using the
MAG (Memory Auto Grouping) function
With the MAG (Memory Auto Grouping) function, only memory channels in the same frequency
band (Band) can be called.
In the memory mode, each time the key is pressed,
only memory channels of the specified frequency
band are automatically recalled as a group, as shown
below:

                      M-ALL
     M-GRP                               M-HF
                                                                       Press the [      ]


M-UHF                                       50MHz


          M-VHF                    M-AIR

  Group                               Selectable Memory Channels
  M-ALL      Recalls all memory channels regardless of frequency band.
   M-HF      Recalls only memory channels in the HF band.
  50MHz      Recalls only memory channels in the 50MHz band.
  M-AIR      Recalls only memory channels in the AIR band.
  M-VHF      Recalls only memory channels in the VHF band.
  M-UHF      Recalls only memory channels in the UHF band.
             Channels, regardless of the band, can be registered in advance and called up as
  M-GRP
             frequently used memory channels in the M-GRP.


     Refer to the next page for instructions to register with M-GRP.




                                                                                            57
```


## Página 60

```text
• Registering frequently used memory channels in M-GRP (Memory Group)
1. Press the [V/M      ] key.
   The memory channel list will be displayed.
2. Rotate the [FUNC] knob to select the mem-
   ory channel to be registered in the M-GRP,
   then press the [FUNC] knob.




3. Touch [M-GRP].




     The memory channel numbers registered in the
     M-GRP are changed in white to Blue.

• Unregistering memory from
  M-GRP (Memory Group)
1. Press the [V/M      ] key.
   The memory channel list will be displayed.
2. Rotate the [FUNC] knob to select the mem-
   ory channel to be unregistered.
3. Touch [M-GRP].




58
```


## Página 61

```text
Edit memory
• Erasing Memory Channel Data                    • Labeling Memories
The contents written to the memory channel       Alphanumeric labels (“Tags”) may be append-
may be erased.                                   ed to memory channels, to aid in recollection
1. Press the [V/M       ] key.                   of the channel’s use (such as a club name, a
   The memory channel list will be displayed.    location etc.).
2. From the channel list, touch and select the   1. Press the [V/M       ] key.
   memory channel to be erased.                     The memory channel list will be displayed.
   Alternately, the memory channel may be        2. From the channel list, touch and select the
   selected by rotating the [FUNC] knob.            desired memory channel.
3. Touch [ERASE] to clear the contents of the       Alternately, the memory channel may be
   selected memory channel.                         selected by rotating the [FUNC] knob.
                                                 3. Touch [NAME] area on the screen.




4. Touch [BACK] to return to the previous
   screen.                                          The character input screen will be dis-
                                                    played.
     Memory channels “M-001” and “5-01”          4. Touch a character key on the display to en-
     through “5-15” cannot be erased.               ter the letters, numbers, or symbols of the
                                                    desired label.
• Check Memory Channel Status                       Up to 12 characters may be used in the cre-
Before programming a memory channel, the            ation of a label.
current contents of that channel may be ver-
ified without the danger of over-writing the
channel.
1. Press the [V/M   ] key.
   The memory channel list will be displayed.




2. From the channel list, touch and select the   5. Touch [ENT].
   memory channel and check, or change the          To add a label to another memory, repeat
   operation mode.                                  steps 2 to 5 above.
   Alternately, the memory channel may be        6. Touch [BACK] to save the new settings and
   selected by rotating the [FUNC] knob.            return to normal operation.
   ● Press the [FUNC] knob to enter memory
     mode on the selected channel.
3. To change the operation mode, touch
   [MODE], rotate the [FUNC] knob to select
   the mode then press the [FUNC] knob.




4. Touch [BACK] to return to the previous
   screen.

                                                                                           59
```


## Página 62

```text
• Scan Skip Setting                                60-Meter (5 MHz) Band
Each memory channel can be set to be skipped       (U.S. and U.K. Version only)
during memory scan.                                Memory channels (U.S. version: “5-01” through
1. Press the [V/M   ] key.                         “5-15”, U.K. version: “5-01” through “5-07”)
   The memory channel list will be displayed.      are pre-programmed, at the factory, with the
                                                   permitted frequencies in the 5 MHz band, and
                                                   the USB, CW-U or DATA-U (U.S. version only)
                                                   mode is automatically selected on these chan-
                                                   nels.
                                                   These channels appear after the “last” PMS
                                                   channel (“P-50U”).
2. From the channel list, touch and select         U.S. Version
   the Memory Channel to be skipped during
   scanning.                                        Channel Number            Frequency
   Alternately, the memory channel may be                5-01          5.332.000 MHz (USB)
   selected by rotating the [FUNC] knob.                 5-02          5.348.000 MHz (USB)
3. Touch [SCAN MEMORY] area on the                       5-03          5.358.500 MHz (USB)
   screen.                                               5-04          5.373.000 MHz (USB)
                                                         5-05          5.405.000 MHz (USB)
                                                         5-06          5.332.000 MHz (CW-U)
                                                         5-07          5.348.000 MHz (CW-U)
                                                         5-08          5.358.500 MHz (CW-U)
                                                         5-09          5.373.000 MHz (CW-U)
                                                         5-10          5.405.000 MHz (CW-U)
4. Rotate the [FUNC] knob to select “SKIP”.              5-11          5.332.000 MHz (DATA-U)
   ● “X” lights up for channels for which “SKIP”         5-12          5.348.000 MHz (DATA-U)
      is set.                                            5-13          5.358.500 MHz (DATA-U)
                                                         5-14          5.373.000 MHz (DATA-U)
                                                         5-15          5.405.000 MHz (DATA-U)

                                                   U.K. Version
                                                    Channel Number     Frequency (U.K. Version)
                                                         5-01          5.260.000 MHz (USB)
5. Touch [BACK] to return to the previous
                                                         5-02          5.280.000 MHz (USB)
   screen.
                                                         5-03          5.290.500 MHz (USB)
     To re-institute a channel into the scanning         5-04          5.368.000 MHz (USB)
     loop, select “SCAN” in step 4 above.                5-05          5.373.000 MHz (USB)
                                                         5-06          5.400.000 MHz (USB)
                                                         5-07          5.405.000 MHz (USB)




60
```


## Página 63

```text
       For additional details on the following Functions, refer to the Advanced Manual which may
       be downloaded from the Yaesu website.

PMS (Programmable Memory scan)
This function scans only the range of frequencies between the lower and upper limits registered in
a pair of PMS (Programmable Memory channel). 50 sets of PMS memory channels (P-01L/P-U01U
to P-50L/P-50U) are available.
Split Memory
Two different frequencies, one for receive and another for transmit, can be registered to a memory
channel.
HOME Channel
A special one-touch “HOME” channel is available for HF, 50MHz, AIR, 144MHz and 430MHz bands,
to allow quick recall of a favorite operating frequency /on each band.




                                                                                              61
```


## Página 64

```text
  VFO and Memory Scanning
Either the VFO or the memory channels of the FTX-1 may be scanned, and the receiver will halt
scanning on any frequency with a signal strong enough to open the receiver squelch.
In the SSB/CW and SSB-based Data modes, the decimal points in the frequency display area will
blink and the scanner will slow down (but does not stop).
VFO/Memory Scan
1. Set the frequency or Memory channel at             ● If the MAIN Tuning Dial (MAIN-side)/SUB
   which scanning is to begin.                          DIAL (SUB-side) knob is rotated while scan-
2. Rotate the [AF/RF/SQL] knob so that the              ning is in progress, the VFO scanning or
   background noise is just silenced (page              memory channel scanning will continue up or
   9).                                                  down in accordance with the direction of the
                                                        Dial Knob rotation. (In other words, if the dial
                                                        is rotated to the left when scanning toward a
                                                        higher frequency or memory channel num-
                                                        ber, the direction of the scan will reverse.)
                                                      To cancel scanning, press the PTT switch.
                                                      If the microphone PTT button is pressed during
                                                      scanning, the scanner will halt at once. Howev-
                                                      er, pressing the PTT button while scanning will
                                                      not cause transmission.
3. Pressing and holding the UP or DWN key             ● During MAG operation, only the channels
   on the microphone will start the scanning.           within the current Group will be scanned.
   ● The operation when a signal is received          ● The manner in which the scanner resumes
     during scanning varies depending on the            after it has paused on a signal may be se-
     mode type.                                         lected by using Menu item [OPERATION
                                                        SETTING] → [BAND/SCAN] → [SCAN RE-
         Other than
         LSB, USB     Scanning will pause.              SUME].
        CW-L, CW-U                                      The default “BUSY” setting will cause the
                                                        scan will continue to pause while receiving
                      Scanning speed will be            the signal.
         LSB, USB
                      slower, but scanning will not
        CW-L, CW-U
                      be paused.

     ● If the scan has paused on a signal, press-
        ing the microphone UP or DWN button
        will cause scanning to resume instantly.




62
```


## Página 65

```text
                                                             Other Functions
Band Stack Operation                               TOT (Time Out Timer)
The FTX-1 employs a triple band-stack VFO          The “Time-Out Timer” (TOT) shuts the trans-
selection technique that permits storing up to     mitter OFF after continuously transmitting for
three favorite frequencies and modes onto          the programmed time.
each band VFO register.                            1. Press and hold the [FUNC] knob.
A typical setup, for the 14MHz band, might be      2. Select [OPERATION SETTING] → [GEN-
arranged like this:                                   ERAL] → [TX TIME OUT TIMER].
1. Program 14.0250 MHz, CW-U Mode, then            3. Rotate the [FUNC] knob, or touch “<” or “>”
   press and hold the [MAG     ] key then             on either side of the value to select the TOT
   touch [14].                                        countdown time (1 -30 min or OFF).
2. Program 14.0800 MHz, RTTY-L Mode, then          4. Press the [FUNC] knob, or wait for about 3
   press and hold the [MAG     ] key then             seconds to save the setting.
   touch [14].                                     5. Press the [BACK] key several times to re-
3. Program 14.1950 MHz, USB Mode, then                turn to normal operation.
   press and hold the [MAG     ] key then
   touch [14].                                     Operation on Alaska Emergency
   With this configuration, successive momen-      Frequency: 5167.5kHz
   tary press and hold the [MAG          ] key     Section 97.401(d) of the regulations govern-
   and then touching [14] will step sequentially   ing amateur radio in the United States permit
   through the three Band Stack VFOs.              emergency Amateur communications on the
                                                   spot frequency of 5167.5 kHz by stations in
                                                   (or within 92.6 km of) the state of Alaska. This
                                                   frequency is only to be used when the imme-
                                                   diate safety of human life and/or property are
                                                   threatened, and is never to be used for routine
        【MAG       】【14】
                                                   communications.
                                                   The FTX-1 is capable of transmitting and re-
                                                   ceiving on 5167.5 kHz under such emergency
                                                   conditions. Use the Setting Menu to activate
                               【MAG        】       the Alaska Emergency Frequency feature:
                                【14】              1. Press and hold the [FUNC] knob.
                                                   2. Select [OPERATION SETTING] → [TX
        【MAG       】【14】                             GNRL] → [EMERGENCY FREQ TX].
                                                   3. Rotate the [FUNC] knob, or touch “<” or “>”
                                                      on either side of the value to select “ON”.
                                                   4. Press the [FUNC] knob, or wait for about 3
                                                      seconds to save the setting.
                                                   5. Press the [BACK] key several times to re-
                                                      turn to normal operation.
                                                      Emergency communication on this spot fre-
                                                      quency is now possible.
                                                   6. Press the [V/M         ] key, as necessary, to
                                                      enter the Memory mode.
                                                   7. Rotate the MAIN dial (MAIN-side)/SUB
                                                      DIAL (SUB-side) knob to select the emer-
                                                      gency channel (“EMG”), which is found after
                                                      the channel “5-15”.




                                                                                                63
```


## Página 66

```text
Using the microSD Card                             • Installing the microSD card
The following operations can be completed          1. Turn OFF the transceiver.
with the use of an microSD card in the trans-      2. Insert the microSD card into the SD card
ceiver:                                               slot, with the contact face on the front, until
                                                      a click sound is heard.
● Record/Play of received audio
● Voice memory (voice recording for transmis-           To prevent the microSD card from pop-
  sion)                                                 ping out, insert and remove the microSD
● Saving the Memory Channel information                 card firmly.
● Saving the Set-up Mode settings
● Transceiver firmware update
● Save a screen capture of the TFT display
• microSD Cards that can be used
YAESU has tested with the 2GB microSD card,
and 4GB, 8GB, 16GB and 32GB microSDHC
cards, most can be used in this radio.
Please format (initialize) the microSD card
used for the first time on this unit with this
transceiver.
     • The microSD or microSDHC cards are
       not provided with the product.
     • Not all microSD and microSDHC cards                                        Contact face
       sold commercially are guaranteed to
       work with this product.                     • Removing the microSD card
                                                   1. Turn OFF the transceiver.
     • Do not touch the contacts of the            2. Push in on the microSD card.
       microSD card with your hands.                  A click sound will be heard and the microSD
     • microSD cards formatted on other de-           card will be pushed outward.
       vices may not properly save information
       when used with this transceiver. Format     • Formatting a microSD card
       microSD cards again with this transceiv-
       er when using memory cards formatted        When using a new microSD card, format it ac-
       with another device.                        cording to the following procedure.
     • Do not remove the microSD card or turn           Formatting a microSD card erases all
       the transceiver OFF, while saving data           data saved on it. Before formatting the
       to the microSD card is in progress.              microSD card, be sure to check the data
     • When a single microSD card is used for           previously saved on it.
       a long period of time, writing and dele-
       tion of data may become disabled. Use       1. Press and hold the [FUNC] knob.
       a new microSD card when data can no         2. Select [EXTENSION SETTING] → [SD
       longer be written or erased.                   CARD].
     • Note that Yaesu shall not be liable for     3. Touch “DONE” on the “FORMAT” item.
       any damages suffered as a result of            The format confirmation screen will be dis-
       data loss or corruption in use of the mi-      played.
       croSD card.                                 4. Touch “OK”, the SD card will be initialized.
                                                      Touch “CANCEL” to cancel the initialization.
                                                   5. “FORMAT COMPLETED” will be displayed
                                                      when initialization is completed.
                                                   6. Touch the screen to end formatting.
                                                   7. Press the [BACK] key several times to re-
                                                      turn to normal operation.




64
```


## Página 67

```text
Saving Memory data and Setting Menu data
The Memory Channel data, and the Setting Menu data can be saved to the microSD Card:

1. Press and hold the [FUNC] knob.               6. Touch “ENT” to start saving data, or touch
2. Select [EXTENSION SETTING] → [SD                 “BACK” to cancel the name input.
   CARD].                                        7. “FILE SAVED” is displayed when data sav-
3. Touch “DONE” for the data item to be             ing is completed.
   saved.                                        8. Touch the screen to end saving data.
                                                 9. Press the [BACK] key several times to re-
                                                    turn to normal operation.




        Saving memory data
                  Save setting menu data

4. To save the file with a new name, touch
   “NEW”.
     To overwrite previously saved data, touch
     the file name, and touch “OK” when the
     overwrite confirmation screen appears.
     Touch “CANCEL” to cancel overwrite
     save.




    When overwriting




          When saving with a new file name

5. Enter the file name (maximum 15 charac-
   ters) on the file name input screen.
   If the file name is not to be changed, pro-
   ceed to step 6 as it is.




                                                                                           65
```


## Página 68

```text
• Reading Memory and Set Menu data                    4. Touch the file name to be loaded.
The Memory and Setting Menu data saved on                Touch “BACK” to cancel reading data.
the microSD card may be read to the Trans-
ceiver.
1. Press the [FUNC] knob.
2. Select [EXTENSION SETTING] → [SD
   CARD].
3. Touch “DONE” of the data item to be read.




                                                      5. When the overwrite confirmation screen ap-
                                                         pears, touch “OK”.
                                                      6. “FILE LOADED” is displayed when the data
                                                      7. reading is completed.
                                                      8. Touch the TFT screen to finish loading the
                                                         data.
       Reading memory data                            9. Once the power is turned OFF, the power is
                                                         turned ON automatically afterwards.
                 Loading setting menu data
                                                           With some OEM microSD cards, the
                                                           screen may not be displayed, even when
                                                           the power is turned ON. If the screen
                                                           does not appear, remove the microSD
                                                           card and the screen will appear.

      For additional details on the following Functions, refer to the Advanced Manual which may
      be downloaded from the Yaesu website.

Screen capture
The display on the TFT screen may be saved on the microSD card.

Display the microSD Card Information
The memory free space of the microSD card may be checked.


                              Adjusting the Date and Clock
  If the time stamp of the saved file is not correct, adjust the date and time by the following oper-
  ation.
  Adjusting the Date
  1. Press and hold the [FUNC] knob → Select [EXTENSION SETTING] → [DATE&TIME].
  2. Select the item “DAY”, “MONTH” or “YEAR”.
  3. Rotate the [FUNC] knob, or touch “<” or “>” on either side of the value to select the “day",
     “month” and “year", then press the [FUNC] knob.
  4. Press the [FUNC] knob, or wait for about 3 seconds to save the setting.
  5. Press the [BACK] key several times to return to normal operation.
  Adjusting the Clock
  1. Press and hold the [FUNC] knob → Select [EXTENSION SETTING] → [DATE&TIME].
  2. Select the item “HOUR” or “MINUTE”.
  3. Rotate the [FUNC] knob, or touch “<” or “>” on either side of the value to select the “hour”
     and “minute”, then press the [FUNC] knob.
  4. Press the [FUNC] knob, or wait for about 3 seconds to save the setting.
  5. Press the [BACK] key several times to return to normal operation.

66
```


## Página 69

```text
                                                                     Setting Menu
The Menu system of the FTX-1 provides extensive customization capability. The transceiver func-
tions can be tailored for the most demanding operators. The Setting Menus are grouped into five
specific utilization categories.
                     Comprehensive settings such as: Transmit & Receive,
                     Interference Reduction, Memory, Scan, etc.
            CW operating Setting                                Display Setting




               SSB, AM, FM, Data & Digital                            APRS Setting
               Communication (such as RTTY)         Date, SD Card Settings, Firmware
                                                    Version Display, Reset Operation.

Using the Menu
1. Press and hold the [FUNC] knob.
2. Touch the category item that is to be set (see above).
3. Touch the desired item, or rotate the [FUNC] knob to select the desired item, then press the
   [FUNC] knob.
4. Rotate the [FUNC] knob to select the desired item, then touch the item, or rotate the [FUNC]
   knob to select the desired item, then press the [FUNC] knob.
5. Rotate the [FUNC] knob, or touch “<” or “>” on either side of the value setting that is to be
   changed.
6. Press the [FUNC] knob, or wait for about 3 seconds to save the setting.
7. Press the [BACK] key several times to return to normal operation.


                                  Reset the Setting Menu
  Use this procedure to restore the Menu settings to their factory defaults, without affecting the
  Programmed Frequency Memories.
  1. Press and hold the [FUNC] knob.
  2. Select [EXTENSION SETTING] → [RESET].
  3. Touch “DONE” of the “MENU CLEAR” item.
     The reset confirmation screen will be displayed.
  4. Touch “OK” or press the [FUNC] knob to reset.
     (Touch “CANCEL” to cancel the reset)
  5. Once the power is turned OFF, it will turn ON automatically afterwards.
     Setting Menu reset is complete.



                                                                                                 67
```


## Página 70

```text
Tables of Menu list Operations
Note: For details, refer to the Advanced Manual (download from the Yaesu website).

              Menu Function                           Available Settings (Default: Bold)
 RADIO SETTING
 MODE SSB          AF TREBLE GAIN            -20 - 0 - 10
                   AF MIDDLE TONE GAIN       -20 - 0 - 10
                   AF BASS GAIN              -20 - 0 - 10
                   AGC FAST DELAY            20 - 300 - 4000 (20msec/step)
                   AGC MID DELAY             20 - 1000 - 4000 (20msec/step)
                   AGC SLOW DELAY            20 - 3000 - 4000 (20msec/step)
                   LCUT FREQ                 OFF / 100 - 1000 (50Hz/step)
                   LCUT SLOPE                6dB/oct / 18dB/oct
                   HCUT FREQ                 700 - 3000 - 4000 (50Hz/step) / OFF
                   HCUT SLOPE                6dB/oct / 18dB/oct
                   USB OUT LEVEL             0 - 50 - 100
                   TX BPF SEL                50-3050 / 100-2900 / 200-2800 / 300-2700 / 400-2600
                   MOD SOURCE                MIC / USB / Bluetooth / AUTO
                   USB MOD GAIN              0 - 50 - 100
                   RPTT SELECT               OFF / RTS / DTR
                                             300/400/600/850/1100/1200/1500/1650/1800/1950/
                   NAR WIDTH                 2100/2250/2400/2450/2500/2600/2700/2800/2900/
                                             3000/3200/3500/4000 (Hz)
                   CW AUTO MODE              OFF / 50M / ON
 MODE AM           AF TREBLE GAIN            -20 - 0 - 10
                   AF MIDDLE TONE GAIN       -20 - 0 - 10
                   AF BASS GAIN              -20 - 0 - 10
                   AGC FAST DELAY            20 - 1000 - 4000 (20msec/step)
                   AGC MID DELAY             20 - 2000 - 4000 (20msec/step)
                   AGC SLOW DELAY            20 - 4000 (20msec/step)
                   LCUT FREQ                 OFF / 100 - 1000 (50Hz/step)
                   LCUT SLOPE                6dB/oct / 18dB/oct
                   HCUT FREQ                 700 - 4000 (50Hz/step) / OFF
                   HCUT SLOPE                6dB/oct / 18dB/oct
                   USB OUT LEVEL             0 - 50 - 100
                   TX BPF SEL                50-3050 / 100-2900 / 200-2800 / 300-2700 / 400-2600
                   MOD SOURCE                MIC / USB / Bluetooth / AUTO
                   USB MOD GAIN              0 - 50 - 100
                   RPTT SELECT               OFF / RTS / DTR
 MODE FM           AF TREBLE GAIN            -20 - 0 - 10
                   AF MIDDLE TONE GAIN       -20 - 0 - 10
                   AF BASS GAIN              -20 - 0 - 10
                   AGC FAST DELAY            20 - 4000 (msec) (20msec/step)
                   AGC MID DELAY             20 - 240 - 4000 (msec) (20msec/step)
                   AGC SLOW DELAY            20 - 500 - 4000 (msec) (20msec/step)
                   LCUT FREQ                 OFF / 100 - 300 - 1000 (Hz) (50Hz/step)
                   LCUT SLOPE                6dB/oct / 18dB/oct
                   HCUT FREQ                 700 - 3000 - 4000 (Hz) (50Hz/step) /OFF
                   HCUT SLOPE                6dB/oct / 18dB/oct


68
```


## Página 71

```text
            Menu Function                       Available Settings (Default: Bold)
                USB OUT LEVEL          0 - 50 - 100
                MOD SOURCE             MIC / USB / Bluetooth / AUTO
                USB MOD GAIN           0 - 50 - 100
                RPTT SELECT            OFF / RTS / DTR
                RPT SHIFT              – / SIMP / + / ARS
                RPT SFT FREQ(28MHz)    0 - 100 - 1000 (kHz) (10kHz/step)
                RPT SFT FREQ(50MHz)    0 - 500 - 4000 (kHz) (10kHz/step)
                RPT SFT FREQ(144MHz)   0.00 - 100 (MHz) (50kHz/step)
                RPT SFT FREQ(430MHz)   0.00 - 5.00 - 100 (MHz) (50kHz/step)
                SQL TYPE               OFF / ENC / TSQ / DCS / PR FREQ / REV TONE
                TONE FREQ              67.0 - 100.0 - 254.1 (Hz)
                DCS CODE               023 - 754
                DCS RX REVERS          NORMAL / REVERS / BOTH
                DCS TX REVERS          NORMAL / REVERS
                PR FREQ                300 - 1600 - 3000 (Hz) (100Hz/step)
                DTMF DELAY             50 / 250 / 450 / 750 / 1000 (ms)
                DTMF SPEED             50 / 100 (ms)
                DTMF MEMORY1 - 9                                     –
MODE DATA       AF TREBLE GAIN         -20 - 0 - 10
                AF MIDDLE TONE GAIN    -20 - 0 - 10
                AF BASS GAIN           -20 - 0 - 10
                AGC FAST DELAY         20 - 160 - 4000 (20msec/step)
                AGC MID DELAY          20 - 500 - 4000 (20msec/step)
                AGC SLOW DELAY         20 - 1500 - 4000 (20msec/step)
                LCUT FREQ              OFF / 100 - 1000 (50Hz/step)
                LCUT SLOPE             6dB/oct / 18dB/oct
                HCUT FREQ              700 - 3200 - 4000 (50Hz/step) /OFF
                HCUT SLOPE             6dB/oct / 18dB/oct
                USB OUT LEVEL          0 - 50 - 100
                TX BPF SEL             50-3050 / 100-2900 / 200-2800 / 300-2700 / 400-2600
                MOD SOURCE             MIC / USB / Bluetooth / AUTO
                USB MOD GAIN           0 - 50 - 100
                RPTT SELECT            OFF / RTS / DTR
                                       50/100/150/200/250/300/350/400/450/500/600/800/
                NAR WIDTH
                                       1200/1400/1700/2000/2400/3000/3200/3500/4000 (Hz)
                PSK TONE               1000 / 1500 / 2000 (Hz)
                DATA SHIFT (SSB)       0 - 1500 - 3000 (10Hz/step)
MODE RTTY       AF TREBLE GAIN         -20 - 0 - 10
                AF MIDDLE TONE GAIN    -20 - 0 - 10
                AF BASS GAIN           -20 - 0 - 10
                AGC FAST DELAY         20 - 160 - 4000 (20msec/step)
                AGC MID DELAY          20 - 500 - 4000 (20msec/step)
                AGC SLOW DELAY         20 - 1500 - 4000 (20msec/step)
                LCUT FREQ              OFF / 100Hz - 300Hz - 1000Hz (50Hz/step)
                LCUT SLOPE             6dB/oct / 18dB/oct
                HCUT FREQ              700Hz - 3000Hz - 4000Hz (50Hz/step) / OFF
                HCUT SLOPE             6dB/oct / 18dB/oct
                USB OUT LEVEL          0 - 50 - 100

                                                                                             69
```


## Página 72

```text
              Menu Function                         Available Settings (Default: Bold)
                  RPTT SELECT            OFF / RTS / DTR
                                         50/100/150/200/250/300/350/400/450/500/600/800/
                  NAR WIDTH
                                         1200/1400/1700/2000/2400/3000/3200/3500/4000 (Hz)
                  MARK FREQUENCY         1275 / 2125 (Hz)
                  SHIFT FREQUENCY        170 / 200 / 425 / 850 (Hz)
                  POLARITY TX            NOR / REV
 DIGITAL          DIGITAL POPUP          OFF / 2 - 10 - 60 / CONTINUE
                  LOCATION SERVICE       OFF / ON
                  STANDBY BEEP           OFF / ON
                  DP-ID LIST                                           –
                  RADIO ID                                    – (cannot be edited)

 CW SETTING
 MODE CW          AF TREBLE GAIN         -20 - 0 - 10
                  AF MIDDLE TONE GAIN    -20 - 0 - 10
                  AF BASS GAIN           -20 - 0 - 10
                  AGC FAST DELAY         20 - 160 - 4000 (msec) (20msec/step)
                  AGC MID DELAY          20 - 500 - 4000 (msec) (20msec/step)
                  AGC SLOW DELAY         20 - 1500 - 4000 (msec) (20msec/step)
                  LCUT FREQ              OFF / 100 - 250 - 1000 (Hz) (50Hz/step)
                  LCUT SLOPE             6dB/oct / 18dB/oct
                  HCUT FREQ              700 - 1200 - 4000 (Hz) (50Hz/step) /OFF
                  HCUT SLOPE             6dB/oct / 18dB/oct
                  USB OUT LEVEL          0 - 50 - 100
                  RPTT SELECT            OFF / RTS / DTR
                                         50/100/150/200/250/300/350/400/450/500/600/800/
                  NAR WIDTH
                                         1200/1400/1700/2000/2400/3000/3200/3500/4000 (Hz)
                  PC KEYING              OFF / RTS / DTR
                  CW BK-IN TYPE          SEMI / FULL
                  CW FREQ DISPLAY        DIRECT FREQ / PITCH OFFSET
                  QSK DELAY TIME         15 / 20 / 25 / 30 (msec)
                  CW INDICATOR           OFF / ON
 KEYER            KEYER TYPE             OFF / BUG / ELEKEY-A / ELEKEY-B / ELEKEY-Y / ACS
                  KEYER DOT/DASH         NOR / REV
                  CW WEIGHT              2.5 - 3.0 - 4.5
                  NUMBER STYLE           1290 / AUNO / AUNT / A2NO / A2NT / 12NO / 12NT
                  CONTEST NUMBER         1 - 9999
                  CW MEMORY 1 - 5        TEXT / MESSAGE
                  REPEAT INTERVAL        1 - 5 - 60 (sec)

 OPERATION SETTING
 GENERAL          BEEP LEVEL             0 - 30 - 100
                  RF/SQL VR              RF / SQL / AUTO
                  TUN/LIN PORT SELECT    OPTION / BAND DATA / CAT-3 / GPO
                  TUNER SELECT           OPTION / ATAS
                  CAT-1 RATE             4800 / 9600 / 19200 / 38400 / 115200 (bps)
                  CAT-1 TIME OUT TIMER   10 / 100 / 1000 / 3000 (msec)
                  CAT-1 CAT-3 STOP BIT   1bit / 2bit


70
```


## Página 73

```text
            Menu Function                        Available Settings (Default: Bold)
                CAT-2 RATE             4800 / 9600 / 19200 / 38400 / 115200 (bps)
                CAT-2 TIME OUT TIMER   10 / 100 / 1000 / 3000 (msec)
                CAT-3 RATE             4800 / 9600 / 19200 / 38400 / 115200 (bps)
                CAT-3 TIME OUT TIMER   10 / 100 / 1000 / 3000 (msec)
                TX TIME OUT TIMER      OFF / 1 - 30 (min)
                REF FREQ FINE ADJ      -25 - 0 - 25
                CHARGE CONTROL         OFF / ON
                SUB BAND MUTE          OFF / ON
                SPEAKER SELECT         Auto / INT / BOTH
                DITHER                 OFF / ON
BAND/SCAN       QMB CH                 5ch / 10ch
                BAND STACK             OFF / ON
                BAND EDGE              OFF / ON
                SCAN RESUME            BUSY / HOLD / 1sec / 3sec / 5sec
RX DSP          IF NOTCH WIDTH         NARROW / WIDE
                NB REJECTION           LOW / MID / HIGH
                NB WIDTH               NARROW / MEDIUM / WIDE
                APF WIDTH              NARROW / MEDIUM / WIDE
                CONTOUR LEVEL          -40 - 15 - 0 - 20
                CONTOUR WIDTH          1 - 10 - 11
TX AUDIO        AMC RELEASE TIME       FAST / MID / SLOW
                PRMTRC EQ1 FREQ        OFF / 100 - 700 (100Hz/step)
                PRMTRC EQ1 LEVEL       -20 - 0 - 5 - 10
                PRMTRC EQ1 BWTH        0 - 10
                PRMTRC EQ2 FREQ        OFF / 700 - 1500 (100Hz/step)
                PRMTRC EQ2 LEVEL       -20 - 0 - 5 - 10
                PRMTRC EQ2 BWTH        0 - 10
                PRMTRC EQ3 FREQ        OFF / 1500 - 3200 (100Hz/step)
                PRMTRC EQ3 LEVEL       -20 - 0 - 5 - 10
                PRMTRC EQ3 BWTH        0 - 10
                P PRMTRC EQ1 FREQ      OFF / 100 - 700 (100Hz/step)
                P PRMTRC EQ1 LEVEL     -20 - 0 - 10
                P PRMTRC EQ1 BWTH      0 - 2 - 10
                P PRMTRC EQ2 FREQ      OFF / 700 - 1500 (100Hz/step)
                P PRMTRC EQ2 LEVEL     -20 - 0 - 10
                P PRMTRC EQ2 BWTH      0 - 1 - 10
                P PRMTRC EQ3 FREQ      OFF / 1500 - 3200 (100Hz/step)
                P PRMTRC EQ3 LEVEL     -20 - 0 - 10
                P PRMTRC EQ3 BWTH      0 - 1 - 10
TX GNRL         MAX POWER(BAT)         0.5 - 6.0 (W)
                QRP MODE               OFF / ON
                HF MAX POWER           0.5 - 10.0 (W)
                50M MAX POWER          0.5 - 10.0 (W)
                70M MAX POWER          0.5 - 6.0 (W)
                144M MAX POWER         0.5 - 10.0 (W)
                430M MAX POWER         0.5 - 10.0 (W)
                AM HF/50 MAX POWER     0.5 - 2.5 (W)


                                                                                      71
```


## Página 74

```text
            Menu Function                            Available Settings (Default: Bold)
                   AM V/U MAX POWER        0.5 - 2.5 (W)
                   VOX SELECT              MIC / USB / BLUETOOTH
                   EMERGENCY FREQ TX       OFF / ON
                   TX INHIBIT              OFF / ON
                   METER DETECTOR          AVERAGE / PEAK
 KEY/DIAL          SSB/CW DIAL STEP        5 / 10 / 20 (Hz)
                   RTTY/PSK DIAL STEP      5 / 10 / 20 (Hz)
                   FM DIAL STEP            5 / 10 / 20 / Auto (Hz)
                   CH STEP                 1 / 2.5 / 5 / 10 (kHz)
                   AM CH STEP              2.5 / 5 / 9 / 10 / 12.5 / 25 (kHz)
                   FM CH STEP              5 / 6.25 / 10 / 12.5 / 20 / 25 (kHz)
                   MAIN STEPS PER REV.     50 / 100 / 200
                                           LOCK / QMB / A/B / V/M / TUNER / VOX/MOX /MODE /
                   MIC P1 - MIC P4         ZIN_SPOT / SPLIT / FINE / NAR / NB /DNR / FREQ UP /
                                           FREQ DOWN / BAND UP /BAND DOWN / ATT / IPO /
                                           DNF / AGC
                                           MIC P1:    LOCK
                   MIC UP
                                           MIC P2:    QMB
                                           MIC P3:    BAND UP
                                           MIC P4:    V/M
                   MIC DOWN                MIC UP:    FREQ UP
                                           MIC DOWN: FREQ DOWN
                   MIC SCAN                OFF / ON
 OPTION            TUNER TYPE SEL ANT1     INT / INT(FAST) / EXT / ATAS
                   TUNER TYPE SEL ANT2     INT / INT(FAST) / EXT / ATAS
                   ANT2 OPERATION          TRX / TX-ANT1,RX-ANT2 / TRX-ANT1,RX-ANT2
                   HF ANT SELECT           ANT1 / ANT2
                   HF MAX POWER            5 - 100 (W)
                   50M MAX POWER           5 - 100 (W)
                   70M MAX POWER           5 - 50 (W)
                   144M MAX POWER          5 - 50 (W)
                   430M MAX POWER          5 - 50 (W)
                   AM MAX POWER            5 - 25 (W)
                   AM V/U MAX POWER        5 - 13 (W)
                   GPS                     OFF / ON
                   GPS PINNING             OFF / ON
                   GPS BAUDRATE            4800 / 9600 / 19200 / 38400 / 115200
                   BLUETOOTH               OFF / ON
                   BLUETOOTH DEVICE LIST   DISCONNECT / CONNECT
                   BLUETOOTH AUDIO         FIX / AUTO

 DISPLAY SETTING
 DISPLAY           MY CALL                 Max 10 characters (FTX-1)
                   MY CALL TIME            OFF / 1 / 2 / 3 / 4 / 5 (sec)
                   POP-UP TIME             FAST / MID / SLOW
                   SCREEN SAVER            OFF / 1 / 2 / 5 / 15 / 30 / 60 (min)
                   SCREEN SAVER(BAT)       OFF / 1 / 2 / 5 / 15 / 30 / 60 (min)
                   SAVER TYPE              Logo / DIMMER / DISP OFF
                   AUTO POWER OFF          OFF / 0.5 - 12 (hour) (0.5hour/step)
                   LED DIMMER              OFF / 1 - 20

72
```


## Página 75

```text
              Menu Function                                Available Settings (Default: Bold)
UNIT                POSITION UNIT                 MM.MM / MM.ss
                    DISTANCE UNIT                 km / mile
                    SPEED UNIT                    km/h / knot / mph
                    ALTITUDE UNIT                 m / ft
                    TEMP UNIT                     c/f
                    RAIN UNIT                     mm / INCH
                    WIND UNIT                     m/s / mph
SCOPE               RBW                           HIGH / MID / LOW
                    SCOPE CTR                     FILTER / CARRIER
                    2D DISP SENSITIVITY           NORMAL / HI
                    3DSS DISP SENSITIVITY         NORMAL / HI
                    AVERAGE                       OFF / 2 / 4 / 8
VFO IND COLOR       VMI COLOR VFO                 BLUE / GREEN / WHITE / NONE
                    VMI COLOR MEMORY              BLUE / GREEN / WHITE / NONE
                    VMI COLOR CLAR                RED / NONE

EXTENSION SETTING
DATE&TIME           TIME ZONE                     -12.0 - 0.0 - 14.0
                    DAY                                                        –
                    MONTH                                                      –
                    YEAR                                                       –
                    HOUR                                                       –
                    MINUTE                                                     –
                    GPS TIME SET                  AUTO / MANUAL
MY POSITION         MY POSITION                   GPS / MANUAL
                    MY POSITION LATITUDE          N 00° 00.00’(00”)
                    MY POSITION LONGTUDE          E 000° 00.00’(00”)
SD CARD             MEM LIST LOAD                                              –
                    MEM LIST SAVE                                              –
                    MENU LOAD                                                  –
                    MENU SAVE                                                  –
                    INFORMATIONS                                               –
                    FIRMWARE UPDATE                                            –
                    FORMAT                                                     –
SOFT VERSION                     –                                             –
CALIBRATION         CALIBRATION                                                –
RESET               MEMORY CLEAR                                               –
                    MENU CLEAR                                                 –
                    ALL RESET                                                  –

APRS SETTING
Refer to the separate Operation Manual APRS Edition for details on the functions.




                                                                                                73
```


## Página 76

```text
  Optional Accessories
FC-40 External Automatic Antenna Tuner (for Wire Antenna)
The FC-40 makes use of the control circuitry built into the transceiver, which allows the operator to
control and monitor automatic operation of the FC-40, which mounts near the antenna feedpoint.
The FC-40 uses specially selected, thermally stable components, and is housed in a waterproof
case to withstand severe environmental conditions with high reliability.
A carefully-chosen combination of solid-state switching components and high-speed relays allows
the FC-40 to match a wide variety of antennas to within a 2:1 SWR on any amateur band frequency
(160 through 6 meters), typically in less than eight seconds. Transmitter power required for match-
ing may be as little as 4 - 60 Watts, and matching settings are automatically stored in memory for
instant recall when the same frequency range is selected later.
Please see the FC-40 Operating Manual for detailed information.

     The FC-40 cannot be connected to the FTX-1 Field configuration.

• Interconnections to FTX-1 optima
After mounting the FC-40, connect the cables from the FC-40 to the ANT and TUNER jacks on the
rear panel of the FTX-1 optima Transceiver.

     Turn OFF the external power supply switch and the FTX-1 power supply switch first before
     connecting the cables.

                                                                                      Antennna
                                                                   Antennna
                                                                   Terminal          GND Terminal




                                                            Antenna Cable
                                                         (supplied with FC-40)

  Install the supplied ferrite core as
  close to the connector as possible.        Control Cable (supplied with FC-40)



                                                                Wrap the ends of the waterproof
                                                                cap with the supplied sealing
                                                                tape to protect against moisture
                                                                ingress.



74
```


## Página 77

```text
• Setup the transceiver                          FC-80 Automatic Antenna Tuner
The optional FC-40 Automatic Antenna Tuner       The FC-80 Automatic Antenna Tuner responds
provides automatic tuning of a coaxial line to   to control commands from the FTX-1 Field
present nominal 50-ohm impedance to the          Transceiver, providing microprocessor-based
FTX-1 optima’s ANT jack.                         impedance matching on the 160 through 6 me-
Before tuning can begin, the FTX-1 optima        ter Amateur bands.
must be configured to recognize that the FC-40
is being used.                                        The FC-80 cannot be connected to the
Configuration is done using the Setting Menu          FTX-1 optima configuration.
Mode:
1. Press and hold the [FUNC] knob.               • Setup the transceiver
2. Select [OPERATION SETTING] → [GEN-            Before tuning can begin, the FTX-1 Field must
   ERAL] → [TUNER SELECT].                       be configured to recognize that the FC-80 is
3. Rotate the [FUNC] knob, or touch “<” or       being used.
   “>” on either side of the value to select     Configuration is done using the Setting Menu
   “OPTION”.                                     Mode:
4. Press the [FUNC] knob, or wait for about 3    1. Press and hold the [FUNC] knob.
   seconds to save the setting.                  2. Select [OPERATION SETTING] → [GEN-
5. Select [OPERATION SETTING] → [OP-                ERAL] → [TUNER SELECT].
   TION] → [TUNER TYPE SEL ANT1] or              3. Rotate the [FUNC] knob, or touch “<” or
   [TUNER TYPE SEL ANT2].                           “>” on either side of the value to select
6. Rotate the [FUNC] knob, or touch “<” or          “OPTION”.
   “>” on either side of the value to select     4. Press the [FUNC] knob, or wait for about 3
   “EXT”.                                           seconds to save the setting.
7. Press the [FUNC] knob, or wait for about 3    5. Press the [BACK] key several times to re-
   seconds to save the setting.                     turn to normal operation.
8. Press the [BACK] key several times to re-
   turn to normal operation.                     • Tuning Operation
• Tuning Operation                                    Depending on the installation and loca-
                                                      tion of some antennas, it may not be pos-
     Depending on the installation and loca-          sible to tune to a low SWR.
     tion of some antennas, it may not be pos-
     sible to tune to a low SWR.                 1. Press and hold the [FUNC] knob.
                                                 2. Touch [TUNER].
1. Press and hold the [FUNC] knob.                  A “TUNE” icon will appear in the display;
2. Touch [TUNER].                                   and the tuner function is activated.
   A “TUNE” icon will appear in the display;     3. Touch [ANT TUNE] key to begin automatic
   and the tuner function is activated.             tuning.
3. Touch [ANT TUNE] key to begin automatic
   tuning.                                          The transmitter will be engaged, and “TUNE”
                                                    will be blinks while tuning is in progress.
   The transmitter will be engaged, and “TUNE”      ● When the optimum tuning point has been
   will be blinks while tuning is in progress.         reached, the transceiver will return to
   ● When the optimum tuning point has been            receive, and the “TUNER” icon will again
      reached, the transceiver will return to          glow steadily (instead of blinking).
      receive, and the “TUNER” icon will again   4. To disengage the ATU from the transmit
      glow steadily (instead of blinking).          line, touch [TUNE].
4. To disengage the ATU from the transmit
   line, touch [TUNE].




                                                                                           75
```


## Página 78

```text
Active-Tuning Antenna System (ATAS-120A)
ATAS-120A is a multi-band auto-tuning antenna that can be used in the amateur bands from the
HF band to the UHF band (7/14/21/28(29) /50/144/430). Using the active tuning mechanism, tuning
can be carried out automatically by the control signal from FTX-1. Please refer to the ATAS-120A
Operating Manual for the assembly and installation of ATAS-120A.

     The ATAS-120A cannot be used when operating on the Li-Ion Battery Pack SBR-52LI power
     alone for the FTX-1 Field. An external 13.8V power supply must be used.

• Interconnections to FTX-1
Connect “ATAS-120A” to the ANT terminal of
the FTX-1 with a coaxial cable as shown in the
diagram below.




  FTX-1 Field




                                                                    ATAS-120A
                                                  Commercial
                                                   antenna
                                                   duplexer


                                                                                     ATAS-120A
                                DC 13.8V, 5A
                           (Required w/ATAS-120A)
                                                           Commercial
                                                          antenna base

                                      Commercial
                                    antenna duplexer
  FTX-1 optima
                                                                           Commercial
                                                                          antenna base




                        To switch between ANT 1 and ANT 2,
 DC 13.8V, 25A          press and hold the [FUNC] knob → touch [ANT] to switch.

76
```


## Página 79

```text
• Setup the transceiver                            • Tuning Operation
Before tuning can begin, the FTX-1 must be              Depending on the installation and loca-
configured to recognize that the ATAS-120A is           tion of some antennas, it may not be pos-
being used.                                             sible to tune to a low SWR.
Configuration is done using the Setting Menu
Mode:                                              The tuning of the ATAS-120A is carried out au-
Setting for operation with the Field head only     tomatically.
1. Press and hold the [FUNC] knob.
2. Select [OPERATION SETTING] → [GEN-               When using the ATAS-120A for the first
   ERAL] → [TUNER SELECT].                          time or when tuning for the first time after
3. Rotate the [FUNC] knob, or touch “<” or “>”      resetting the FTX-1, tuning is not performed
   on either side of the value to select “ATAS”.    for about 1 minute until the FTX-1 recogniz-
4. Press the [FUNC] knob, or wait for about 3       es the ATAS-120A even if the touch [ANT
   seconds to save the setting.                     TUNE].
5. Press the [BACK] key several times to re-        Tuning is performed after recognizing the
   turn to normal operation.                        ATAS-120A.
   The “ATAS” icon will appear in the display.
                                                   Press the [TUNE] key to begin automatic tun-
     When attaching the Field Head to the          ing.
     SPA-1 and using the SPA-1’s built-in tun-
     er, change the above setting to “OPTION.”     ● The transmitter will be engaged, and the
                                                     “ATAS” icon will blink while tuning is in prog-
                                                     ress.
Setting for operation with the FTX-1 optima
                                                   ● When the optimum tuning point has been
1. Press and hold the [FUNC] knob.                   reached, the transceiver will return to re-
2. Select [OPERATION SETTING] → [OP-                 ceive, and the “ATAS” icon will again glow
   TION] → [TUNER TYPE SEL ANT1] or                  steadily (instead of blinking).
   [TUNER TYPE SEL ANT2].
3. Rotate the [FUNC] knob, or touch “<” or
   “>” on either side of the value to select       • Manual Tuning
   “ATAS”.                                         The tuning of the ATAS-120A may be carried
4. Press the [FUNC] knob, or wait for about 3      out manually.
   seconds to save the setting.                    Press the PTT switch on the microphone to
5. Press the [BACK] key several times to re-       transmit and then press the UP/DWN button on
   turn to normal operation.                       the microphone to adjust the antenna until the
   The “ATAS” icon will appear in the display.     meter indicates the minimum SWR.
                                                   The meter on the screen will automatically
                                                   change to the SWR meter.




                                                                                                77
```


## Página 80

```text
Bluetooth Unit BU-6
The FTX-1 can be equipped with the Bluetooth function by installing the optional Bluetooth unit
“BU-6”. Hands-free operation is possible using the optional Bluetooth headset (SSM-BT20) or a
commercially available Bluetooth headset.

     The BU-6 consists of a BU-5 and cover exclusively for the FTX-1.


       For additional details on the Bluetooth Functions, refer to the Advanced Manual which may
       be downloaded from the Yaesu website.

1. Turn the transceiver OFF.
2. Remove the Bluetooth unit cover from the transceiver.
3. Apply double-sided tape to Bluetooth unit.
   Double-sided tape is included with the BU-6.
4. Align the Bluetooth unit connector with the connector on the board and install.
5. Carefully attach the supplied cover.


                                                                     Remove




                                                                      Bluetooth Unit




                                              Apply double-sided tape
                                                       Supplied Cover

Side Carry Handle MHG-1
     Do not use an improper screw for mounting the MHG-1! An improper screw may cause a “short
     circuit” to the internal circuitry, causing serious damage!




                                                                   Handle end

                                                                          Mounting Screw



                                                          Handle


                                     Handle end     Mounting Screw

78
```


## Página 81

```text
                                  Resetting the Microprocessor
Memory channels, setting menus, and various settings can be initialized and returned to their factory
defaults.
                                                                      FUNC knob




                                     EXTENSION SETTING




                                  RESET                     DONE
1. Display the reset item selection screen.
   Press and hold the [FUNC] knob → touch [EXTENSION SETTING] → touch [RESET]
2. Touch “DONE” of the item you want to reset (see below).
   Or Select an item with the [FUNC] knob and press the [FUNC] knob.
   A confirmation screen for reset execution is displayed.
   MEMORY CLEAR (Memory Reset)
   Only the contents of the memory channel are initialized (factory default).
   All stored information will be erased, but channel M-001 will return to the initial setting of
   7.000.000MHz, LSB.
   MENU CLEAR (Setting Menu Reset)
   Only the contents of the setting menu are returned to their default values (factory default).
   ALL RESET (All Reset)
   Initializes all settings of this unit, including various settings, memories, and setting menus, and
   restores the factory settings.
3. Touch [OK] or select [OK] with the [FUNC] knob and press the [FUNC] knob to execute the
   reset.
   To cancel the reset, touch [CANCEL] or select [CANCEL] with the [FUNC] knob and press the
   [FUNC] knob.
4. The power is turned OFF once and then turned ON automatically.
   The reset is complete.



                                                                                                   79
```


## Página 82

```text
  Specifications
General
Tx Frequency Range:          1.8MHz - 450MHz (Specified performance, Amateur bands only)
                             70MHz - 70.5MHz (Specified performance, UK Amateur bands only)
Rx Frequency Range:          30kHz - 174MHz, 400MHz - 470MHz (operating)
                             1.8MHz band - 430MHz band
                             (specified performance, Amateur bands only)
Emission Modes:              A1A (CW), A3E (AM), J3E (LSB, USB), F3E (FM), F7W (C4FM),
                             F1D, F2D
Frequency Steps:             1*/5/10/20Hz (CW, SSB, AM), 5/10/20Hz (FM) *FINE tuning “ON”
Antenna Impedance:           50Ω, unbalanced
Operating Temperature Range: +14°F to +122°F (-10°C to +50°C)
Frequency Stability:         ±0.5ppm (after 1 minute @ +14°F to +122°F [-10°C to +50°C])
Supply Voltage:              DC10.8V (SBR-52LI)
                             DC13.8V ± 15% (EXT DC Jack)
Power Consumption (approx.) Rx (no signal) 0.6A
                             Rx (signal present) 0.9A
                             Tx (Field, 6W) 2.5A
                             Tx (Field, 10W) 3A
                             Tx (optima, HF/50MHz 100W) 21A
                             Tx (optima, 144MHz 50W) 9A
                             Tx (optima, 430MHz 50W) 12A
Dimensions (WxHxD):          FTX-1 Field: 8.4” x 3.5” x 2.2” (213 x 89 x 55mm)
                             FTX-1 optima: 8.4” x 3.5” x 9.4” (213 x 89 x 240mm)
Weight (approx.):            FTX-1 Field: 2.75 lbs (1.25kg)
                             FTX-1 optima: 8.6 lbs (3.9kg)

Transmitter
Power Output:                   FTX-1 Field: 0.5 - 6W (0.5 - 2.5W AM Carrier) @ SBR-52LI
		                                              0.5 - 10W (70MHz band: 0.5 - 6W)
		                                              (0.5 - 2.5W AM Carrier) @ EXT DC 13.8V
                                FTX-1 optima: HF/50MHz band: 5 - 100W (5 - 25W AM Carrier)
		                                              144/430MHz band: 5 - 50W (5 - 13W AM Carrier)
Modulation Types:               J3E (SSB): Balanced
                                A3E (AM): Low-Level (Early Stage)
                                F1D, F2D, F3E (FM): Variable Reactance
                                F7W (C4FM): 4-level FSK
Maximum FM Deviation:           ±5.0kHz / ±2.5kHz (Narrow)
Harmonic Radiation:             Better than -50dB (1.8MHz - 29.7MHz Amateur bands)
                                Better than -60dB (50MHz Amateur band, FTX-1 Field 10W)
                                Better than -63dB (50MHz Amateur band, FTX-1 optima 100W)
                                Better than -51dB (70MHz Amateur band, FTX-1 Field 6W)
                                Better than -60dB (70/144/430MHz Amateur band, FTX-1 optima 50W)
SSB Carrier Suppression:        At least 60dB below peak output
Undesired Sideband Suppression: At least 60dB below peak output
Bandwidth:                      3kHz (LSB, USB), 500Hz (CW), 6kHz (AM), 16kHz (FM/C4FM)
Audio Response (SSB):           Not more than -6dB from 300 to 2700Hz
Microphone Impedance:           600Ω (200 to 10kΩ)




80
```


## Página 83

```text
Receiver
Circuit Type:                Direct Sampling Superheterodyne (below 48MHz)
                             Single Conversion IF Sampling (48MHz and above)
Intermediate Frequencies: MAIN: 44.5 - 49.5MHz, SUB: 41.3 - 44.3MHz (48MHz and above)
Sensitivity (typ):           SSB/CW (BW: 2.4kHz, 10dB S+N/N)
		                                  1.8MHz - 30MHz        0.16µV (IPO: AMP2)
		                                  50MHz - 54MHz         0.125µV (IPO: AMP2)
		                                  70MHz - 70.5MHz       0.16µV (IPO: AMP2)
		                                  144MHz - 148MHz       0.125µV (AMP: ON)
		                                  430MHz - 450MHz       0.125µV (AMP: ON)
                             AM (BW: 6kHz, 10dB S+N/N, 30% modulation @400Hz)
		                                  0.5MHz - 1.8MHz       7.9µV
		                                  1.8MHz - 30MHz        2µV (IPO: AMP2)
		                                  50MHz - 54MHz         1µV (IPO: AMP2)
		                                  70MHz - 70.5MHz       2µV (IPO: AMP2)
		                                  144MHz - 148MHz       1µV (AMP: ON)
		                                  430MHz - 450MHz       1µV (AMP: ON)
                             FM (BW: 12kHz, 12dB SINAD, 3.5kHz DEV @1kHz )
		                                  28MHz - 30MHz         0.25µV (IPO: AMP2)
		                                  50MHz - 54MHz         0.2µV (IPO: AMP2)
		                                  70MHz - 70.5MHz       0.25µV (IPO: AMP2)
		                                  144MHz - 148MHz       0.125µV (AMP: ON)
		                                  430MHz - 450MHz       0.125µV (AMP: ON)
Selectivity (WIDTH: Center): Mode                   –6dB               –60dB
                             CW (BW=0.5kHz)         0.5kHz or better   0.75kHz or less
                             SSB (BW=2.4kHz)        2.4kHz or better   3.6kHz or less
                             AM (BW=6kHz)           6kHz or better     15kHz or less
                             FM (BW=12kHz)          12kHz or better    25kHz or less
Image Rejection:             70dB or better (1.8MHz - 28MHz Amateur bands)
                             60dB or better (50MHz, 70MHz, 144MHz, 430MHz Amateur bands)
Maximum Audio Output:        FTX-1 Field: 1.5W (4Ω with 10% THD)
                             FTX-1 optima: 4W (1.5 + 2.5 W) (4Ω with 10% THD)
Audio Output Impedance:      4 to 16Ω (4Ω: nominal)
Conducted Radiation:         Less than 4nW

Specifications are subject to change, in the interest of technical improvement, without
notice or obligation, and are guaranteed only within the amateur bands.




  The typefaces included herein are solely developed by DynaComware Taiwan Inc.

                                                                                       81
```


## Página 84

```text
  YAESU LIMITED WARRANTY
Limited Warranty is valid only in the country/region where this product was originally purchased.
On-line Warranty Registration:
Thank you for buying YAESU products! We are confident your new radio will serve your needs for many
years! Please register your product at www.yaesu.com - Owner’s Corner
Warranty Terms:
Subject to the Limitations of the Warranty and the Warranty Procedures described below, YAESU MUSEN
hereby warrants this product to be free of defects in materials and workmanship in normal use during the
“Warranty Period.” (the “Limited Warranty”).
Limitations of Warranty:
A. YAESU MUSEN is not liable for any express warranties except the Limited Warranty described above.
B. The Limited Warranty is extended only to the original end-use purchaser or the person receiving this
   product as a gift, and shall not be extended to any other person or transferee.
C. Unless a different warranty period is stated with this YAESU product, the Warranty Period is three years
   from the date of retail purchase by the original end-use purchaser.
D. The Limited Warranty is valid only in the country/region where this product was originally purchased.
E. During the Warranty Period, YAESU MUSEN will, at its sole option, repair or replace (using new or re-
   furbished replacement parts) any defective parts within a reasonable period of time and free of charge.
F. The Limited Warranty does not cover shipping cost (including transportation and insurance) from you to
   us, or any import fees, duties or taxes.
G. The Limited Warranty does not cover any impairment caused by tampering, misuse, failure to follow
   instructions supplied with the product, unauthorized modifications, or damage to this product for any
   reasons, such as: accident; excess moisture; lightning; power surges; connection to improper voltage
   supply; damage caused by inadequate packing or shipping procedures; loss of, damage to or corrup-
   tion of stored data; product modification to enable operation in another country/purpose other than the
   country/purpose for which it was designed, manufactured, approved and/or authorized; or the repair of
   products damaged by these modifications.
H. The Limited Warranty applies only to the product as it existed at the time of the original purchase, by
   the original retail purchaser, and shall not preclude YAESU MUSEN from later making any changes in
   design, adding to, or otherwise improving subsequent versions of this product, or impose upon YAESU
   MUSEN any obligation to modify or alter this product to conform to such changes, or improvements.
I. YAESU MUSEN assumes no responsibility for any consequential damages caused by, or arising out of,
   any such defect in materials or workmanship.
J. TO THE FULLEST EXTENT PERMITTED BY LAW, YAESU MUSEN SHALL NOT BE RESPONSIBLE
   FOR ANY IMPLIED WARRANTY WITH RESPECT TO THIS PRODUCT.
K. If the original retail purchaser timely complies with the Warranty Procedures described below, and YAESU
   MUSEN elects to send the purchaser a replacement product rather than repair the “original product”, then
   the Limited Warranty shall apply to the replacement product only for the remainder of the original product
   Warranty Period.
L. Warranty statutes vary from state to state, or country to country, so some of the above limitations may
   not apply to your location.
Warranty Procedures:
1. To find the Authorized YAESU Service Center in your country/region, visit www.yaesu.com. Contact the
   YAESU Service Center for specific return and shipping instructions, or contact an authorized YAESU
   dealer/distributor from whom the product was originally purchased.
2. Include proof of original purchase from an authorized YAESU dealer/distributor, and ship the product,
   freight prepaid, to the address provided by the YAESU Service Center in your country/ region.
3. Upon receipt of this product, returned in accordance with the procedures described above, by the
   YAESU Authorized Service Center, all reasonable efforts will be expended by YAESU MUSEN to cause
   this product to conform to its original specifications. YAESU MUSEN will return the repaired product (or
   a replacement product) free of charge to the original purchaser. The decision to repair or replace this
   product is the sole discretion of YAESU MUSEN.
Other conditions:
YAESU MUSEN’S MAXIMUM LIABILITY SHALL NOT EXCEED THE ACTUAL PURCHASE PRICE PAID
FOR THE PRODUCT. IN NO EVENT SHALL YAESU MUSEN BE LIABLE FOR LOSS OF, DAMAGE TO
OR CORRUPTION OF STORED DATA, OR FOR SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR INDI-
RECT DAMAGES, HOW EVER CAUSED; INCLUDING WITHOUT LIMITATION TO THE REPLACEMENT
OF EQUIPMENT AND PROPERTY, AND ANY COSTS OF RECOVERING, PROGRAMMING OR RE-
PRODUCING ANY PROGRAM OR DATA STORED IN OR USED WITH THE YAESU PRODUCT.
Some Countries in Europe and some States of the USA do not allow the exclusion or limitation of inciden-
tal or consequential damages, or a limitation on how long an implied warranty lasts, so the above limita-
tion or exclusions may not apply. This warranty provides specific rights, there may be other rights available
which may vary between countries in Europe or from state to state within the USA.
This Limited Warranty is void if the label bearing the serial number has been removed or defaced.

82
```


## Página 85

```text
Declaration of Conformity
Type of Equipment:             HF/50MHz/144MHz/430MHz TRANSCEIVER
Brand Name:                    YAESU
Model Number:                  FTX-1
Manufacturer:                  YAESU MUSEN CO., LTD.
Address of Manufacturer:       Omori Bell port D building 3F, 6-26-3 Minamioi,
                               Shinagawa-ku, Tokyo 140-0013 JAPAN
This device complies with part 15 of the FCC Rules. Operation is subject to the following two condi-
tions;
(1) this device may not cause harmful interference, and (2) this device must accept any interference
received, including interference that may cause undesired operation.
The technical documentation as required by the Conformity Assessment procedures is kept at the
following address:
Company: Yaesu U.S.A.
Address: 6125 Phyllis Drive, Cypress, CA 90630, U.S.A.
Telephone: (714) 827-7600


                                           FCC Statements
Federal Communications Commission (FCC) Statement
15.105(b)
This equipment has been tested and found to comply with the limits for a Class B digital device, pur-
suant to part 15 of the FCC Rules. These limits are designed to provide reasonable protection against
harmful interference in a residential installation. This equipment generates, uses, and can radiate
radio frequency energy; and, if not installed and used in accordance with the instructions, may cause
harmful interference to radio communications. However, there is no guarantee that interference will not
occur in a particular installation.
If this equipment does cause harmful interference to radio or television reception, which can be deter-
mined by turning the equipment off and on, the user is encouraged to try to correct the interference by
one or more of the following measures:
r Reorient or relocate the receiving antenna.
r Increase the separation between the equipment and receiver.
r Connect the equipment into an outlet on a circuit different from that to which the receiver is connect-
    ed.
r Consult the dealer or an experienced radio/TV technician for help.
15.19
This device complies with part 15 of the FCC Rules. Operation is subject to the following two condi-
tions:
(1) This device may not cause harmful interference, and (2) this device must accept any interference
received, including interference that may cause undesired.
15.21
You are cautioned that changes or modifications not expressly approved by the part responsible for
compliance could void the user’s authority to operate the equipment.
FCC RF Radiation Exposure Statement:
1. This Transmitter must not be co-located or operating in conjunction with any other antenna or trans-
    mitter.
2. For portable operation, this device has been tested and meets FCC RF exposure guidelines. When
    used with an accessory that contains metal may not ensure compliance with FCC RF exposure
    guidelines.

WARNING: MODIFICATION OF THIS DEVICE TO RECEIVE CELLULAR RADIOTELEPHONE SER-
VICE SIGNALS IS PROHIBITED UNDER FCC RULES AND FEDERAL LAW.

CAN ICES-3 (B) / NMB-3 (B)


                                                                                                       83
```


## Página 86

```text
  Display the Certifications of FCC
1. Turn the transceiver OFF.
2. While holding the [DISP] key in, press
   and hold in the Power switch to turn the
   transceiver ON.




   The Certifications of FCC is displayed.
3. Touch [BACK] to return to normal opera-
   tion.




84
```


## Página 87

```text
                                 EU Declaration of Conformity
We, Yaesu Musen Co. Ltd of Tokyo, Japan, hereby declare that this radio equipment FTX-1 is
in full compliance with EU Radio Equipment Directive 2014/53/EU. The full text of the Decla-
ration of Conformity for this product is available to view at http://www.yaesu.com/jp/red



                               ATTENTION – Condition of use
This transceiver operates on frequencies that
are regulated. Use of the Transmitter in the EU
countries shown in the accompanying table is not
permitted without authorization. Users should con-   AT    BE        BG    CY     CZ   DE
                                                     DK    ES        EE    FI     FR   EL
sult their local spectrum management authority for   HR    HU        IE    IT     LT   LU
licensing conditions applicable to this equipment.   LV    MT        NL    PL     PT   RO
                                                        SK     SI    SE    CH     IS   LI
                                                        NO     –      –     –      –    –




                     Disposal of Electronic and Electrical Equipment
Products with the symbol (crossed-out wheeled bin) cannot be disposed as
household waste.
Electronic and Electrical Equipment should be recycled at a facility capable of
handling these items and their waste by-products.
Please contact a local equipment supplier representative or service center for
information about the waste collection system in your country.
```


## Página 88

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
YAESU USA                                                       2506E-DS
6125 Phyllis Drive, Cypress, CA 90630, U.S.A.             Printed in Japan
YAESU UK
Unit 4, Concorde Park, Concorde Way, Segensworth North,
Fareham, Hampshire PO15 5FG, United Kingdom
```
