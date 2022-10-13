const { default: mongoose } = require("mongoose");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const userSchema = new Schema({
    user: String,
    whitelisted: Boolean,
    token: String,
    twitter: String
  });

module.exports = mongoose.model("User", userSchema);