# FTX-1 Instruction Manual — WIRES-X Edition (rev. 2603-B)

Texto extraído de `FTX-1_WIRES-X_ENG_2603-B.pdf` (31 páginas) com `pdftotext -layout`, página a página, 
para uso como contexto. Tabelas e diagramas aparecem como texto alinhado; em caso de dúvida consulte o PDF.


## Página 1

```text
HF/50/144/430MHz ALL MODE TRANSCEIVER



Instruction Manual (WIRES-X Edition)




When operating the FTX-1 in HRI mode, perform the following steps.
1. Press and hold the [FUNC] knob.
2. Display the “PAGE 3/3 FM/C4FM” function screen.
3. Touch [HRI MODE], or rotate the [FUNC] knob to select [HRI MODE] then press
   the [FUNC] knob.
   HRI MODE will be set to “ON”.




For details on operation in HRI mode, please refer to the “WIRES-X Connection Kit
HRI-200 Instruction Manual”.
Note that there is no need to connect the HRI-200 to the FTX-1.
```


## Página 2

```text
     Contents
What is WIRES-X?.............................................................................................................................3
     Terminology.................................................................................................................................4
Connecting to a Distant Station Using WIRES-X............................................................................7
  Finding a local node........................................................................................................................7
  Connecting in digital mode..............................................................................................................8
     Connecting to a WIRES-X digital node........................................................................................8
     Connecting to a node or room on the Internet...........................................................................10
     Communicating with others.......................................................................................................12
  Release the WIRES-X connection.................................................................................................12
  Useful functions in digital mode.....................................................................................................13
     Using preset channels...............................................................................................................13
     Connecting to registered nodes or rooms..................................................................................14
     Confirming the location of the local node and the partner station..............................................16
  Connecting to analog nodes..........................................................................................................17
     Connecting to nodes or rooms on the Internet..........................................................................17
     Communicating with others.......................................................................................................17
     Disconnecting from the node or room........................................................................................17
Using WIRES-X Digital Node News Function................................................................................18
  Viewing messages.........................................................................................................................18
     Viewing text data in local nodes................................................................................................18
     Viewing text data on the WIRES-X server (INT NEWS)............................................................19
     Viewing text data in nodes or rooms on the Internet.................................................................21
  Importing images...........................................................................................................................21
     Importing images from local nodes............................................................................................21
     Importing images from the WIRES-X server (INT NEWS).........................................................21
     Importing data from nodes or rooms on the Internet.................................................................22
  Viewing imported data later...........................................................................................................22
  Deleting imported data..................................................................................................................23
     Deleting a file.............................................................................................................................23
  Listening to audio messages.........................................................................................................23
     Listening to emergency information in the local node................................................................23
     Listening to routine messages in local nodes............................................................................24
     Listening to routine messages on the WIRES-X server (INT NEWS)........................................24
     Listening to emergency information in nodes or rooms on the Internet.....................................24
     Listening to routine messages in nodes or rooms on the Internet.............................................24
  Transmitting messages and images..............................................................................................25
     Creating and transmitting messages to local nodes..................................................................25
     Transmitting saved messages or images to local nodes...........................................................26
     Creating and transmitting messages to nodes or rooms on the Internet...................................26
     Transmitting saved messages or images to nodes or rooms on the Internet............................26
  Transmitting audio messages........................................................................................................27
     Transmitting emergency information to local nodes..................................................................27
     Transmitting routine voice messages to local nodes.................................................................27
     Transmitting emergency information to nodes or rooms on the Internet...................................27
     Transmitting routine messages to nodes or rooms on the Internet............................................27
WIRES-X Setup Menus....................................................................................................................28
  WIRES-X setting mode list............................................................................................................28
  Using the WIRES-X setup menu...................................................................................................28
     Setting the operating frequencies for WIRES-X (PRESET SEARCH).......................................28
     Setting the preset frequencies (VHF PRESET FREQ / UHF PRESET FREQ).........................28
     The DG-ID feature to access the WIRES-X node station (WIRES-X DG-ID)............................28
     Setting the item order on the node & room lists (SEARCH SETUP).........................................29
     Setting the WIRES-X Mode (NODE MODE)..............................................................................29
Other Function.................................................................................................................................30
     Turning the display ON and OFF...............................................................................................30
```


## Página 3

```text
 What is WIRES-X?
WIRES (Wide-coverage Internet Repeater Enhancement System) is an Internet
communication system which expands the range of amateur radio communication. By
relaying radio signals via the Internet, stations can be connected where radio waves
cannot reach each other.
WIRES uses local nodes (stations connected to the Internet via PCs) as access points
which repeat communications of conventional amateur radio stations. When the local
nodes are connected to each other via the Internet, amateur stations all over the world
can communicate with each other just by connecting conventional stations to the local
nodes.




                                        Internet




               Station    Local node               Local node    Station




In addition to the WIRES features, WIRES-X also supports digital communications.
Using WIRES-X, you can transmit and receive digitalized data such as text, image data
and audio.
Using WIRES-X in conjunction with the transceiver allows analog/digital communications
with stations beyond the direct radio contact range. In digital communication mode, you
can search for stations by call signs or keywords, and exchange data such as messages
and location information.




                                          3
```


## Página 4

```text
Terminology
 Node
Radio repeater connected to the Internet via a PC, creating an internet WIRES access
point which repeats signals of conventional amateur radio stations.
z Local node
Node within the radio contact range of a conventional amateur radio station.
z Analog node
An analog node is a transceiver or repeater using the conventional FM format, that can
only repeat DTMF (Dual Tone Multi Frequency) codes, and analog audio transmissions.
z Digital node
A Digital node is a transceiver or repeater compatible with digital communications in
C4FM (Continuous 4 level FM) format. This type of node can transmit/receive digital
audio, as well as text and image data. You can also repeat DTMF codes and analog
audio transmissions.




                                                                       Local
                                                            Local      node        Local
                                                            node                   node
                                                                                                Local
                                 Internet connection                                            node

                        Local node                                                                          Local node
                                                       PC                                  PC

                                     HRI-200                           WIRES                            HRI-200
                                                                       server




 Station                                                                                                                 Station
                                               Local
                                               node                                             Local
        As long as the local nodes                                                              node
     are linked to each other, stations
       can communicate with each                               Local            Local
          other by connecting to a                             node             node
                 local node




                                                                        4
```


## Página 5

```text
 WIRES-X user ID
YAESU provides identification names with the WIRES-X nodes. For each node, a DTMF
ID (5-digit number) and an alphanumeric user ID (up to 10 digits) are assigned.
If the ID of the node to be connected is known, you can transmit the DTMF code
from the transceiver, or directly specify the node to connect by searching the digital
characters (only for digital nodes).
z ID list
Nodes and rooms which are currently operating WIRES are listed and published on the
Yaesu website. Information such as the IDs, the call signs and the operating frequencies
is provided (some nodes may not be published due to the wishes of the owners).
 Room (Round QSO Room)
WIRES system creates community space QSO Rooms to which multiple nodes can
connect simultaneously. Besides voice communications, you can also chat with text
messages on the local node control PC.
z Open room
Room which allows all nodes to connect
z Closed room
Room only registered nodes can connect
z Digital room
Room only digital nodes can connect
z Activity
Nodes currently connected to a specific room




                                          A
                                                                     A
                                D                                                 D
                               JF7XXX                                          JH4XXX
                                -ND3                                            -ND4


            D   JQ1YBF-ND1                                                               JA2YSO-ND2   D
                                    PC                                       PC

                     HRI-200                        WIRES                                HRI-200
                                                    server


                                                                           JA2-ROOM
                                                                          JQ1YBF-ND1
                                                                          JF7XXX-ND3
  JA1XXX                                                                   JA1XXX-S1                      JA2XXX
    -S1                                                                                                     -S2
                    Internet connection                                   * Currently
                                                                          3 activities
                                                When a local node
                                                                          in this room
                                                connects to a room,
                                          stations already connected to
                                          that node are also connected
                                                   to the room




Tip: In the illustration, D refers to digital nodes and A refers to analog nodes.




                                                    5
```


## Página 6

```text
 News function
This feature allows digital data such as text, image, and audio, to be saved on the local
node control PC. The data can be accessed from the connected digital stations.
From a digital transceiver connected to a local node or room, you can access the local
node (LOCAL NEWS) and the data storage area (news station), and import (upload) and
export (download) data.
Owners of a node or room can import/export data from/to their own station via a PC. The
owner can also delete data and change information such as its name and attribution.
The WIRES-X server also has its own news station (INT NEWS) where you can read
information and data supplied by YAESU.




                                               D              Internet connection
                                                                                               D
                                             JF7XXX                                        JH4XXX
                                              -ND3                                          -ND4


                 D      JQ1YBF-ND1                                                                   JA2YSO-ND2   D
                                                   PC                                     PC

                               HRI-200                                    WIRES                      HRI-200
                                                                          server


                                              Local news                INT news       JA2-ROOM

                                           Audio messages          Audio messages      Local news
 JA1XXX                                     (emergency)             (emergency)                                       JA2XXX
   -S1                                     News Station            News Station                                         -S2
                                                                                    Audio messages
                                           Audio files             Audio files       (emergency)
                 Connecting to a node      Text data               Text data        News Station
              allows you to access data    Images                  Images           Audio files
          in the local node, the WIRES-X
                                                                                    Text data
            server, and a node or room
                                                                                    Images
                    on the Internet
                                                        Data on the WIRES-X
                                                          server is only for
                                                            downloading




 Preset search function
If the preferred channel for connecting to a local node is programmed (preset) in the
transceiver, the channel can be scanned automatically when WIRES-X is started.
Utilize this function as follows:
   • Quickly connect to the usually accessed local node by presetting its frequency in
     advance.
   • By presetting a channel frequency shared with your friends nodes, you can quickly
     connect the transceiver to a local node even while traveling in other areas.

Two transceivers can be used on the node, one for the preset search channel (receive
only channel) and the other for the voice channel (operation channel).




                                                                           6
```


## Página 7

```text
 Connecting to a Distant Station Using WIRES-X
Finding a local node
To communicate with WIRES-X, a WIRES-X node station (local node) must be
established within radio contact range of the user transceiver.

WIRES-X nodes are stations users voluntarily registered with Yaesu. Their information
such as locations and operation styles are listed on the Yaesu website:
https://www.yaesu.com/jp/en/wires-x/index.php

First use this list to search for a nearby local WIRES-X node, and then find nodes on the
Internet used by people you want to communicate with; write down the node names and
frequencies.Since the connection procedure differs between digital stations and analog
stations, confirm whether the node is an analog station or a digital station.

  • When the local node is a digital station:
    Connect from your transceiver in digital mode.
    (Nodes on the Internet can connect to both digital and analog stations.)
  • When the local node in an analog station:
    Connect from your transceiver in analog mode.
    (Nodes on the Internet can connect to both analog and digital stations.)




                                           7
```


## Página 8

```text
Connecting in digital mode
• Ascertain the DG-ID setting of the WIRES-X node station. Connecting to the
  WIRES-X node requires the transceiver DG-ID be set according to the DG-ID code
  set on the WIRES-X node station.
• Confirm that the operating mode of WIRES-X node has been set to the C4FM digital
  mode.
• Before using WIRES-X, set the communication modulation mode to C4FM.
Connecting to a WIRES-X digital node
1. Set the transmit/receive DG-ID to the same ID number as the node station.
   For details, refer to the FTX-1 Operating Manual.

     The DG-ID number set by this connection method is the normal DG-ID number set by
     function menu. Please note that this is not the WIRES-X DG-ID number set in [WIRES-X DG-
     ID] in the setup menu.

2. Transmit with the corresponding node transmit/receive frequency.
   • If the signal is received from the node, continue to operate as is.
   • If not receiving the signal from the node, it is possible that the node station is not
     connected to the Internet, if so, proceed to the next step “Connecting to the other
     node ID or the other room ID”.
 Connecting to the other node ID or the other room ID
1. Press and hold the FUNC knob  select [RADIO SETTING]  [WIRES-X]  [WIRES
   DG-ID]  Press the FUNC knob.
   The WIRES-X DG-ID setting screen will be displayed.
2. Rotate the FUNC knob, or touch “<” or “>” on either
   side of the value to set the WIRES-X DG-ID to the
   same ID number as the node station.
   AUTO: Only open nodes, set to the DG-ID number
            “00” may be connected.
   1 to 99: Only nodes matching the set DG-ID number
            may be connected.
   The default setting is “AUTO”
3. Press the FUNC knob, or wait for about 3 seconds to save the setting.
4. Set the frequency of the desired local node.
5. Press and hold the [GM/X] key.
   “X” flashes on the display.                                                                         ALL          [ 356 ]
                                                                    JQ1YBF-ND1
                                                                                         CQ-OPEN-ROOM                   47
         • While “X” is flashing, briefly press the [GM/X] key to
                                                                    SH I NAGAWA-KU
                                                                                         JA1YOE-OIW-ROOM                21
                                                                                         JA1YOE-ROOM-B                  16
           re-establish connection to the local node.                                    JA1YOE-ROOM-C
                                                                                         JQ1YBG-13-ROOM-B
                                                                                                                          9
                                                                                                                          8
         • When a local node cannot be found, “ X ” will            YAESUMUSEN ROOM1
                                                                                         JQ1YBG-13-ROOM-C                 7

           disappear in 20 seconds.
                                                                                         JQ1YBG-13-ROOM-D                 5
                                                                                     999 J2YSO-ND2             NAGOYA-CITY
                                                                                                SCOPE
                                                                    CENTER
                                                                     ALL     SEARCH
                                                                              3DSS    ENTER
                                                                                       MULTIID CATEGORY
                                                                                                 MAIN
                                                                                                        DISCONNECT
                                                                                                           SPAN      SPEED
                                                                                                                      LOG




                                               8
```


## Página 9

```text
6. When a local node is found, “X” is lit solid, and the node name and city name appear
   on the bottom part of the screen.
   Depending on the connection status, the screen will show one of four display pat-
   terns.
Example #1:
   Connected to the local node, but unable to connect to
   Internet nodes or rooms (never before established a
   connection to Internet nodes or rooms).



Example #2:
   Connected to the local node, but unable to connect to
   Internet nodes or rooms (previously succeeded in es-
   tablishing a connection to an Internet node or room).
   Press the PTT switch to connect to the blinking node
   or room for internet communication.
Example #3:
   Connected to the local node, and successfully con-
   nected to an Internet node or room (the Internet node
   or room is the same one most recently used).
   Press the PTT switch for internet communication.

Example #4:
   Connected to the local node, and successfully con-
   nected to an Internet node or room (the Internet node
   or room is different from the one most recently used).
   To use the current connection destination, press the
   PTT switch and continue Internet communication.
   Now press the FUNC knob or press the PTT switch to
   connect to the selected Internet node or room and initi-
   ate Internet communication.




                                           9
```


## Página 10

```text
Connecting to a node or room on the Internet
Connect to the chosen node or room in one of the following ways:
  • Select an accessible node or room from the list
  • Specify the node name or room name
  • Select the most recently connected node or room
  • Specify the DTMF ID of the node or room to connect
z Searching from the node & room lists
1. While displaying the local node, touch [ALL].
   • Displays the list of accessible nodes and rooms.
   • Connection destinations are displayed from the room
     list and then node list.
   • On the connection destination room columns, the
     number of activities (the number of nodes connected
     to each room) appears on the right side.
2. Rotate the FUNC knob to select the node or room to
   connect, then press the FUNC knob.




                                         10
```


## Página 11

```text
z Searching by node or room name
1. While displaying the local node, touch [SEARCH].
   The character input screen is displayed.




2. Enter all or part of the room or node name, then touch
   [ENT].




   If connection destinations with the first part of the name matching the partial entry
   are found, they will be listed.
   • If the entered name is found, the transceiver establishes connection immediately.
   • The screen displays the room list search results followed by the node list search
      results.
   • On the room search results, the number of nodes connected to each room ap-
      pears on the right side.
3. Rotate the FUNC knob to select the node or room to
   connect, then press the FUNC knob.
   • If connection is unsuccessful, an error message ap-
     pears and the screen returns to the list of nodes and
     rooms.


z Connecting to the most recently connected node or room
The previously Internet connected node or room, appears
and flashes at the screen.
Touch the flashing node or room or the PTT switch to start
the connection.




                                          11
```


## Página 12

```text
z Specify the DTMF ID of the node or room to connect
1. While the WIRES-X connection screen is displayed,
   touch [ENTER ID].
   The ENTER ID screen is displayed.




2. Use the numeric keypad of the display and touch the 5
   digits of the room or node to connect, then touch [ENT].




Communicating with others
1. While displaying the station you are currently connect-
   ed to, press PTT switch.
   The transceiver switches to transmit.
2. Release the PTT switch.
   The transceiver returns to receive.


z Disconnecting from the node or room
1. Touch [DISCONNECT] on the screen.


Release the WIRES-X connection
Press and hold the [GM/X] key to disconnect and switch to the frequency display screen,
the “X” on the frequency display disappears.
If the disconnect operation is not performed, the local node and the node or room remain
connected.




                                           12
```


## Página 13

```text
Useful functions in digital mode
Using preset channels
Programming (presetting) a channel frequency allows you to easily connect to a local
node.
By sharing a channel frequency with other nodes, you can connect the transceiver to a
local node even while you are out. This is useful for a group to operate a station.
z Presetting a channel
1. Press and hold the FUNC knob  [RADIO SETTING]  [WIRES-X]  [VHF PRE-
    SET FREQ] or [UHF PRESET FREQ]  Press the FUNC knob.
2. Rotate the FUNC knob to select frequency.
3. Press the FUNC knob, or wait for about 3 seconds to
    save the setting.




z Connecting to a preset channel
1. Follow the above procedure “Presetting a channel” to make the preset channel avail-
   able in advance.
2. Press and hold the FUNC knob  [RADIO SETTING]  [WIRES-X]  [PRESET
   SEARCH]  Press the FUNC knob.
3. Rotate the FUNC knob to select “PRESET”.
4. Press the FUNC knob, or wait for about 3 seconds to save the setting.
5. Press and hold the [GM/X] key.
   The preset frequency is recalled, and the “X” icons
   flash alternately in the upper of the frequency display.




6. When a local node is found, “X” lights up, and the node
   name and city name appear on the screen.

z Stop using preset channels
   Set step 3 of the previous section to “MANUAL”.




                                          13
```


## Página 14

```text
Connecting to registered nodes or rooms
Register names of Internet nodes and rooms on the Internet and sort them into
5 categories. Up to a total of 20 nodes and rooms can be registered in each category.
z Registering category names
1. Touch [CATEGORY].
2. Rotate the FUNC knob to select one of [C1] to [C5],
   then press the FUNC knob.
3. Touch [EDIT].
   The character input screen is displayed.



4. Enter the category name.
                                                                                            CATEGORY
                                                            YAESU|

5. Touch [ENT] to set the category name and return to the   Q       W       E       R       T       Y       U       I       O       P

   previous screen.                                             A       S       D       F       G       H       J       K       L       @

   Repeat steps 2 to 5 to set more category names.          -       Z       X       C       V       B       N       M       -       -

                                                            Caps        -       -       -       -       -       -                       ABC
                                                                                    123
                                                            あ漢              A       #%^                     Space                       ENT


6. Press the [BACK] key return to normal operation.


z Registering a node or room
1. Touch [CATEGORY].
   The category list displayed.




2. Rotate the FUNC knob to select one of [C1] to [C5].
3. Touch [ADD].
   The name of the currently connected node or room is
   added to the registered node and room lists.
4. Press the [BACK] key.
   The screen returns to the list.




                                         14
```


## Página 15

```text
z Connecting to registered nodes or rooms
1. Touch [CATEGORY].
   The category list displayed.




2. Rotate the FUNC knob to select one of [C1] to [C5],
   then press the FUNC knob.
   • Displays the node and room lists.
   • On room listings, the number of nodes connected to
     each room appears at the right side.

3. Rotate the FUNC knob to a node or room, then press
   the FUNC knob.
   Rotate the FUNC knob to select the node or room to
   connect, then press PTT to switch to establish a con-
   nection.




                                        15
```


## Página 16

```text
Confirming the location of the local node and the partner station
When the signal from the connected local node contains GPS location data, the
information can be displayed on the screen.
1. Press the [DISP] key on WIRES-X screen.
    If the signal of the partner station operating in C4FM digital DN (V/D) mode includes
    GPS position information, the distance, direction, latitude and longitude of the re-
    ceived station from your own station are displayed.



                                                JQ1YBG                          Callsign of other station
 Direction of other station            JQ1YBG   DISTANCE 123km                  Distance to other station
  Direction of your station                     N 35°35.32’                     Latitude of other station
                                                E139°43.53’                     Longitude of other station

                                                         SCOPE
                              CENTER   3DSS     MULTI     MAIN
                                                                 SPAN   SPEED
                                                                        BACK



2. Press the [DISP] key again to return to normal operation.




                                                        16
```


## Página 17

```text
Connecting to analog nodes
When the node to connect is an analog station, use the DTMF function on the
transceiver. For details on using the DTMF function, refer to “DTMF Operation” in the
Advance Manual.
Connecting to nodes or rooms on the Internet
1. Set the main band frequency to the local node frequency.
2. Press and hold the [N/W (MODE)] key, then touch [FM] to switch to analog FM
   mode.
3. Press and hold the [FUNC] knob, then touch [DTMF].
   The DTMF CODE screen is displayed.
4. While pressing and holding the PTT switch, use the numeric keypad of the display
   and touch the DTMF ID key “#” followed by the 5 digits of the room or node to
   connect.
5. Release the PTT switch on the microphone, and keep the transceiver in receiving
   mode for about 10 seconds.
   • Once connection is established, you will be able to hear audio.
   • The connection destination screen does not appear.
     DTMF codes consisting of up to 16 digits can be stored into 9 channels on the transceiver.
     If you register the codes of frequently-used connection destinations in advance, you can
     easily transmit the code by selecting it on the function menu screen. For details, refer to
     “DTMF Operation” in the Advance Manual.

Communicating with others
1. Press the PTT switch, and speak into microphone.
2. Release the PTT switch.
   The transceiver switches to receive mode.
Disconnecting from the node or room
1. While pressing the PTT switch on the microphone, use the numeric keypad of the
   display and touch the “#” followed by “99999” (DTMF disconnect command).
2. Disconnects the node or room.




                                             17
```


## Página 18

```text
 Using WIRES-X Digital Node News Function
In WIRES-X digital mode, you can transmit/receive messages (text data) and images;
you can also record/play audio messages.

     Before using the News function, insert a microSD memory card into the transceiver. For
     details, refer to “Using the microSD Card” in the basic operating manual.

Viewing messages
Text messages and data that are transmitted/received by either a local node, or a node
or room on the Internet, can be read on the transceiver.
Viewing text data in local nodes
1. On the connected destination screen, touch the local
   node.




2. Rotate the FUNC knob to select the local node name
   displayed in [LOCAL NEWS], then press the FUNC
   knob.
   If data reception is successful, the menu list of the lo-
   cal node appears.

3. Rotate the FUNC knob to select [NEWS STATION],
   then press the FUNC knob.
   The upload/download select screen will appear.




4. Rotate the FUNC knob to select [DOWNLOAD], then
   press the FUNC knob.
   The data type select screen will appear.




5. Rotate the FUNC knob to select [MESSAGE], then
   press the FUNC knob.
   • If data reception is successful, the list of data ap-
     pears.
   • The list shows the registered data in reverse chrono-
     logical order.




                                           18
```


## Página 19

```text
6. Rotate the FUNC knob to select the message to view,
   then press the FUNC knob.
   Downloads the data and displays the content of the
   message.




7. Press the [BACK] key.
   Returns the screen to the data list.

     On each screen, press the [BACK] key to return to the previous screen.



Viewing text data on the WIRES-X server (INT NEWS)
Text information provided by Yaesu on the WIRES-X server can be read from the
transceiver.
1. On the connected destination screen, touch the local
   node.




2. Rotate the FUNC knob to select the local node name
   displayed in [LOCAL NEWS], then press the FUNC
   knob.
   If data reception is successful, the menu list of the lo-
   cal node appears.

3. Rotate the FUNC knob to select [INT NEWS], then
   press the FUNC knob.
   Displays the menu of the WIRES-X server.




                                             19
```


## Página 20

```text
4. Rotate the FUNC knob to select [NEWS STATION],
   then press the FUNC knob.
   Displays the data type select screen.




5. Rotate the FUNC knob to select [MESSAGE], then
   press the FUNC knob.
   • If data reception is successful, the list of data appears.
   • The list shows the registered data in reverse chrono-
     logical order.

6. Rotate the FUNC knob to select the message to view,
   then press the FUNC knob.
   • Downloads the data and displays the content of the
     message.



7. Press the [BACK] key.
   Returns the screen to the data list.




                                             20
```


## Página 21

```text
Viewing text data in nodes or rooms on the Internet
1. Rotate the FUNC knob to select the Internet node or
   room to connect, then press the FUNC knob.
   Displays the menu list of the Internet node or room.




2. Follow steps 3 to 6 of “Viewing text data in local nodes”
   (page 18) to import the data.


Importing images
Images can be imported (transmitted/received) to the transceiver from a local node, or
an Internet node or room.
Importing images from local nodes
1. Follow steps 1 to 4 in “Viewing text data in local nodes” on page 18 to display the
   data type select screen.
2. Rotate the FUNC knob to select [PICT], then press the FUNC knob.
   • Displays the data list.
   • The list shows the registered data in reverse chronological order.
3. Rotate the FUNC knob to select the image to download, then press the FUNC knob.
   • Starts downloading and “WAITING” appears.
   • After data import completes, the image appears.
   • When the microSD memory card does not have enough free space, data cannot
     be imported.
4. Press the [BACK] key.
   Returns the screen to the data list.


Importing images from the WIRES-X server (INT NEWS)
Images provided by Yaesu on the WIRES-X server can be imported onto the transceiver.
1. Follow steps 1 to 4 in “Viewing text data on the WIRES-X server (INT NEWS)” (page
   19) to display the data type select screen.
2. Follow steps 2 to 3 in “Importing images from local nodes” above to display or save
   the image data.




                                           21
```


## Página 22

```text
Importing data from nodes or rooms on the Internet
1. Rotate the FUNC knob to select the node or room to
   connect, then press the FUNC knob.
   Displays the menu list of the Internet node or room.




2. Follow steps 3 to 6 in “Viewing text data in local nodes” (page 18) to import data.
     • On each screen, press the [BACK] key to return to the previous screen.
     • Even when the category list or data list is displayed, you can press the PTT switch to send
       audio to the connected node or room on the Internet for communication.


Viewing imported data later
You can also view the imported data later.
1. Touch [LOG].
   Displays the LOG screen.




2. Rotate the FUNC knob to select [MESSAGE] or [PICT],
   then press the FUNC knob.
   • Displays the data list.
   • The list shows the registered data in reverse chrono-
     logical order.


3. Press the [BACK] key.
   Returns the screen to the data list.




                                              22
```


## Página 23

```text
Deleting imported data
Deleting a file
1. Follow steps 1 to 2 “Viewing imported data later” on page 22 to display the content
   of the message or image data.
2. Touch [DELETE].
   The confirmation message appears.
3. Touch [OK].
   “COMPLETED” will appear on the display.



Listening to audio messages
You can play and listen to audio files transmitted/received by a local node, or node or
room on the Internet. Audio files are categorized into the following two types:
EMERGENCY: Emergency information. Depending on the node or room settings,
                  mandatory updates are supplied to connected nodes and rooms in
                  five-minute intervals for two hours starting from the initial dissemina-
                  tion of the news.
NEWS STATION: Normal message. Listen to the message anytime, as long as the
                  message is not deleted from the node or room.

     VOICE data of the news function cannot be imported to the transceiver.


Listening to emergency information in the local node
1. On the connected destination screen, touch the local-
   node.




2. Rotate the FUNC knob to select the local node name
   displayed in [LOCAL NEWS], then press the FUNC
   knob.
   If data reception is successful, the menu list of the lo-
   cal node appears.

3. Rotate the FUNC knob to select [EMERGENCY], then
   press the FUNC knob.
   • Displays the data list.
   • The list shows the registered data in reverse chrono-
     logical order.

4. Rotate the FUNC knob to select the audio file to play, then press the FUNC knob.
   • Audio playback begins.

                                             23
```


## Página 24

```text
Listening to routine messages in local nodes
1. Follow steps 1 to 4 in “Viewing text data in local nodes” on page 18 to display the
   data type select screen.
2. Rotate the FUNC knob to select [VOICE], then press the FUNC knob.
   • Displays the data list.
   • The list shows the registered data in reverse chronological order.
3. Rotate the FUNC knob to select the audio file to play, then press the FUNC knob.
   • Audio playback begins.
Listening to routine messages on the WIRES-X server (INT NEWS)
1. Follow steps 1 to 4 in “Viewing text data on the WIRES-X server (INT NEWS)” on
   page 19 to display the data type select scre‑en.
2. Rotate the FUNC knob to select [VOICE], then press the FUNC knob.
   • Displays the data list.
   • The list shows the registered data in reverse chronological order.
3. Rotate the FUNC knob to select the audio file to play, then press the FUNC knob.
   • Audio playback begins.
Listening to emergency information in nodes or rooms on the Internet
1. Rotate the FUNC knob to select the node or room on the Internet to connect, then
   press the FUNC knob.
   Displays the menu list of the node or room on the Internet.
2. Rotate the FUNC knob to select [EMERGENCY], then press the FUNC knob.
   Displays the data list.
   • The list shows the registered data in reverse chronological order.
   • Data registered within the past 2 hours flashes.
3. Rotate the FUNC knob to select the audio file to play, then press the FUNC knob.
   • Audio playback begins.
Listening to routine messages in nodes or rooms on the Internet
1. Rotate the FUNC knob to select the Internet node or room to connect, then press the
   FUNC knob.
   Displays the menu list of the node or room on the Internet.
2. To play the audio, follow steps 2 to 3 in “Listening to routine messages in local
   nodes” on above.




                                         24
```


## Página 25

```text
Transmitting messages and images
You can transmit messages (text data) and images saved on the microSD memory card
inserted into the transceiver, to a local node, or a node or room on the Internet. You can
also create a new message and transmit it.
     For details on microSD memory cards, refer to “Using the microSD Card” in the basic
     operating manual.

Creating and transmitting messages to local nodes
1. Follow steps 1 to 3 in “Viewing text data in local nodes” on page 18 to display the
   upload (transmission)/download (reception) select screen.
2. Rotate the FUNC knob to select [UPLOAD], then
   press the FUNC knob.
   Displays the data type select screen.




3. Rotate the FUNC knob to select [MESSAGE], then
   press the FUNC knob.
   Displays the data list.




4. Touch [NEW].




5. Touch [EDIT].




6. Use the numeric keypad of the display to enter a message of up to 80 characters,
   then touch [ENT].
   Displays the entered message confirmation screen.
7. Touch [UPLOAD].
   • Starts message transmission.




                                           25
```


## Página 26

```text
Transmitting saved messages or images to local nodes
1. Follow steps 1 to 2 in “Creating and transmitting messages to local nodes” on page
   25 to display the data type select screen.
2. Rotate the FUNC knob to select [MESSAGE] or [PICT], then press the FUNC knob.
   Displays the data list.
3. Rotate the FUNC knob to select the message or image to transmit, then press the
   FUNC knob.
4. Touch [FWD] for message or touch [UPLOAD] for image.

Creating and transmitting messages to nodes or rooms on the Internet
1. Rotate the FUNC knob to select the node or room on the Internet to connect to, then
   press the FUNC knob.
   Displays the menu list of the node or room on the Internet.
2. Rotate the FUNC knob to select [NEWS STATION], then press the FUNC knob.
   Displays the upload (transmission)/download (reception) select screen.
3. Rotate the FUNC knob to select [UPLOAD], then press the FUNC knob.
   Displays the data type select screen.
4. Follow steps 3 to 7 in “Creating and transmitting messages to local nodes” on page
   25 to create and transmit a message.

Transmitting saved messages or images to nodes or rooms on the Internet
1. Follow the above steps 1 to 3 in “Creating and transmitting messages to nodes or
   rooms on the Internet”, to display the data type select screen.
2. Follow the above steps 2 to 4 in “Transmitting saved messages or images to local
   nodes”, to select and transmit data.




                                         26
```


## Página 27

```text
Transmitting audio messages
You can transmit audio messages spoken into the microphone as data to a local node,
or node or room on the Internet.
Audio files are categorized into the following 2 types:
EMERGENCY: Emergency information. Depending on the node or room settings,
                   mandatory updates are supplied to connected nodes and rooms in
                   five-minute intervals for two hours starting from the initial dissemina-
                   tion of the news.
NEWS STATION: Normal message. Listen to the message anytime as long as the mes-
                   sage is not deleted from the node or room.
Transmitting emergency information to local nodes
1. Follow steps 1 to 2 in “Viewing text data in local nodes” on page 18 to display the
   menu list of the local node.
2. Rotate the FUNC knob to select [EMERGENCY].
3. Press the PTT switch, a beep sounds and a confirmation screen “VOICE UPLOAD”
   Appears. When sending emergency information, press and hold the PTT switch,
   after three beeps. While pressing the PTT switch, speak into MIC.
   The maximum recording time is one minute.
4. Release the PTT switch after completing audio transmission.
   After message transmission completes, “COMPLETED” appears and then the
   screen returns to the menu list of the local node.
Transmitting routine voice messages to local nodes
1. Follow steps 1 to 3 in “Viewing text data in local nodes” on page 18 to display the
   upload (transmission)/download (reception) select screen.
2. Rotate the FUNC knob to select [UPLOAD], then press the FUNC knob.
   Displays the data type select screen.
3. Rotate the FUNC knob to select [VOICE].
4. While pressing the PTT, speak into MIC.
   The maximum recording time is one minute.
5. Release the PTT after completing audio transmission.
   After message transmission completes, “COMPLETED” appears.
Transmitting emergency information to nodes or rooms on the Internet
1. Rotate the FUNC knob to select the node or room on the Internet to connect, then
   press the FUNC knob.
   Displays the menu list of the node or room on the Internet.
2. Follow steps 2 to 4 in “Transmitting emergency information to local nodes” above to
   transmit a message.
Transmitting routine messages to nodes or rooms on the Internet
1. Follow steps 1 to 2 in “Creating and transmitting messages to nodes or rooms on the
   Internet” on page 26 to display the upload (transmission)/download (reception) se-
   lect screen.
2. Follow steps 2 to 5 in “Transmitting routine voice messages to local nodes” above to
   transmit a message.
                                           27
```


## Página 28

```text
 WIRES-X Setup Menus
WIRES-X setting mode list
  Setup Menu no. / item             Description                         Selectable options
                                                               (Options in bold are the default settings)
                          Setting the operating frequencies
 PRESET SEARCH                                                 MANUAL / PRESET
                          for repeaters/WIRES-X
 VHF PRESET FREQ          Setting preset frequencies           Depends on the transceiver version.
 UHF PRESET FREQ          Setting preset frequencies           Depends on the transceiver version.
 WIRES-X DG-ID            Setting the DG-ID                    1 to 99 / AUTO
                          Setting the item order on the node
 SEARCH SETUP                                                  HISTORY / ACTIVITY
                          & room lists
 Node Mode                WIRES-X operation mode setting       AP RADIO / AP P / DIRECT


Using the WIRES-X setup menu
Setting the operating frequencies for WIRES-X (PRESET SEARCH)
The [GM/X] key can be set to always use the preset frequency when searching for the
local node.
For details, refer to “Using preset channels” on page 13.


Setting the preset frequencies (VHF PRESET FREQ / UHF PRESET FREQ)
It is possible to save a preset frequency being used when searching for a local node by
pressing the [GM/X] key.
For details, refer to “Using preset channels” on page 13.


The DG-ID feature to access the WIRES-X node station (WIRES-X DG-ID)
Set the WIRES-X, DG-ID number used when connecting to the local node station by
pressing the [GM/X] key.
1. Press and hold the FUNC knob  [RADIO SETTING]  [WIRES-X]  [WIRES-X
   DG-ID]  Press the FUNC knob.
2. Rotate the FUNC knob, or touch “<” or “>” on either
   side of the value to set the WIRES-X DG-ID to the
   same ID number as the node station.
   AUTO: Only open nodes, set to the DG-ID number
            “00” may be connected.
   1 to 99: Only nodes matching the set DG-ID number
            may be connected.
   The default setting is “AUTO”.
3. Press the FUNC knob, or wait for about 3 seconds to save the setting.




                                               28
```


## Página 29

```text
Setting the item order on the node & room lists (SEARCH SETUP)
To change the sort criteria of the list of connection destinations on the Internet:
1. Press and hold the FUNC knob  [RADIO SETTING]  [WIRES-X]  [SEARCH
   SETUP]  Press the FUNC knob.
2. Rotate the FUNC knob to select “HISTORY” or
   “ACTIVITY”.
   HISTORY: Displays the list sorted in order of the con-
               nection destination that your station most
               recently connected to.
   ACTIVITY: Displays the list sorted in descending or-
               der from the room with the most nodes
               connected. Nodes come after rooms.
   The default setting is “HISTORY”.
3. Press the FUNC knob, or wait for about 3 seconds to save the setting.


Setting the WIRES-X Mode (NODE MODE)
To change the WIRES-X communication method:
1. Press and hold the FUNC knob  [RADIO SETTING]  [WIRES-X]  [Node Mode]
    Press the FUNC knob.
2. Rotate the FUNC knob to select Node Mode.
   AP RADIO: The FTX-1 can function as a standalone
               access point.
   AP PC:      Connect a computer to the FTX-1 and
               communicate using C4FM over the air.
   DIRECT: Does not send or receive over the air, but
               communicates using the FTX-1 through a
               connected computer.
   The default setting is “AP RADIO”.
3. Press the FUNC knob, or wait for about 3 seconds to save the setting.




                                         29
```


## Página 30

```text
 Other Function
Turning the display ON and OFF
Press and hold the [DISP] key to hide all displays on the
screen.
Press the any key or rotate the knob to show the hidden
displays.




                                        30
```


## Página 31

```text
Copyright 2026
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
Fareham, Hampshire PO15 5FG, United Kingdom               2603-A
```
