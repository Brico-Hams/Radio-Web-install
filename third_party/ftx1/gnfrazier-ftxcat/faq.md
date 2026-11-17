# Frequently Asked Questions

## Windows

## Mac

## Linux

### Why did I get a permission denied error?

The `serial.serialutil.SerialException: [Errno 13] Permission denied: '/dev/ttyUSB0'` error occurs because your user account lacks the necessary permissions to access the serial port device file in Linux. 

The correct and permanent way to fix this is to add your user to the appropriate group that owns the serial port device (usually the dialout group). 

#### Verify Group Permissions

Check the device permissions
```bash
ls -l /dev/ttyUSB0
```
Response should be something like `crw-rw---- 1 root dialout 188, 0 Feb 26 06:28 /dev/ttyUSB0`.

Check user permissions
```bash
groups
```

Response should be simlar to `adm cdrom sudo dip plugdev users docker`.

**Note dialout is not listed as a group for the user.** 

#### Permanent Solution: Add User to the dialout Group 

Identify the device group (optional but recommended):
Open a terminal and use the ls -l command to see which group owns the device file.
```bash
ls -l /dev/ttyUSB0
```
The output will look something like: `crw-rw---- 1 root dialout 188, 0 ... /dev/ttyUSB0`. The group name in this example is dialout.

Add your user to the group:
Use the sudo usermod command, replacing <username> with your actual username and <group> with the group name identified in the previous step (e.g., dialout).
```bash
sudo usermod -a -G <group> <username>
```
A common command for most systems (like Ubuntu/Debian) is:
```bash
sudo usermod -a -G dialout $USER
```
Log out and log back in:
For the group changes to take effect, you must log out of your current session and log back in (or reboot your computer). New group memberships are applied at login.

Verify permissions:
After logging back in, you can verify your user is in the correct group by running the groups command. Your username should appear in the list of groups. 
