exports.generate = (amount, maxpos) => {
    let salt = "";
    let chars = "";
    for(let i=32; i < maxpos; i++ ) chars += String.fromCharCode(i)
    for(let i=0; i < amount; i++ ) salt += chars.charAt(Math.floor(Math.random() * chars.length));
    return salt
}    