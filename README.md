# electron-react-password-manager

![](https://www.cs.cmu.edu/~cangiuli/img/angry.gif)
*Are you tired of trying to remember or write down all your passwords?*

## > Installation

### Downloads

#### [Binaries](https://github.com/michaeldegroot/electron-react-password-manager/releases)

**After download:**
 *Unzip contents somewhere and run the executable, easy as that.*

### Development

-   `cd src`
-   `gulp`

*Every time you change files in the src folder;*
*gulp will transpile, minify, concat or restart the process for you*

## > Features

-   Node.js, ES6, Built with [Electron](http://electron.atom.io/)
-   Frontend built with [React](https://facebook.github.io/react/) And [React Bootstrap](https://react-bootstrap.github.io)
-   Random salt for PBKD2F that is generated on first run
-   Unique computer fingerprint used as a pepper for PBKD2F
-   up to 400k PBKD2F iterations
-   up to 2048bit AES passphrase encryption (aes-256-cbc)
-   HMAC Authentication (Encrypt-then-MAC)
-   CSPRNG initialization vectors
-   Stores passwords, email and service name encrypted to a local database
-   No accounts just a password you come up with to rule them all
-   Your password is your passphrase to unlock all your other passwords
-   All of your data is stored **CLIENT** sided, **NO** server storage!

## > Known Issues
https://github.com/michaeldegroot/electron-react-password-manager/issues

## > Security Flowchart

*Because obscurity is no security*
![](https://raw.githubusercontent.com/michaeldegroot/electron-react-password-manager/master/project%20related/flowchart6.jpg)

## > Showcase

![](http://i.imgur.com/yJsAW7u.png)
![](http://i.imgur.com/x87128U.png)
![](http://i.imgur.com/GECgz3D.png)
