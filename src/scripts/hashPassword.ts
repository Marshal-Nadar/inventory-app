import bcrypt from "bcryptjs";

const password = "Password@123";
const hash = await bcrypt.hash(password, 10);
console.log(hash);
