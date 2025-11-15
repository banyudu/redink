# Redink Installation

Thank you for downloading Redink!

## macOS Installation

On macOS, you may see an error message saying **"Redink is damaged and can't be opened"**. This is because the application is not yet notarized with Apple.

To fix this, please follow these steps:

1. Make sure Redink is in your `/Applications` folder.
2. Open the disk image (`.dmg` file) you downloaded.
3. Inside, you will find an `install.sh` script. Double-click it to run it.
4. Follow the instructions in the terminal window that opens.

This script will remove the quarantine attributes that prevent the app from running.

If you still have issues, you can try the following:

1. Open `System Settings` > `Privacy & Security`.
2. Scroll down and you should see a message about "Redink".
3. Click `Open Anyway`.

## Windows Installation

On Windows, you might see a "Windows protected your PC" SmartScreen prompt.

To run the application:

1. Click on **More info**.
2. Click on **Run anyway**.

If you don't see the "Run anyway" option, you can unblock the file:

1. Right-click on the installer or `Redink.exe`.
2. Go to `Properties`.
3. Under the `General` tab, check the `Unblock` box at the bottom.
4. Click `OK`.

You can also run the `install.bat` script included in the installer for guidance.

## Linux Installation

For Linux, you should be able to run the AppImage or `.deb` file directly. You may need to make the AppImage executable first:

```bash
chmod +x Redink-*.AppImage
./Redink-*.AppImage
```
