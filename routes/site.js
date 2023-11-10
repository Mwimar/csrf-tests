const express = require("express");

const bcrypt = require("bcryptjs");

const mongodb = require("mongodb");

const db = require("../data/database");

const ObjectId = mongodb.ObjectId;

const router = express.Router();

router.get("/", function (req, res) {
  res.render("welcome");
});

router.get("/signup", function (req, res) {
  let sessionInputData = req.session.inputData;

  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      email: "",
      confirmEmail: "",
      password: "",
    };
  }
  req.session.inputData = null;
  res.render("signup", { inputData: sessionInputData });
});

router.get("/login", function (req, res) {
  res.render("login");
});

router.post("/signup", async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredConfirmEmail = userData["confirm-email"];
  const enteredPassword = userData.password;
  const hashedPassword = await bcrypt.hash(enteredPassword, 12);

  if (
    !enteredEmail ||
    !enteredConfirmEmail ||
    !enteredPassword ||
    enteredPassword.trim() < 6 ||
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail.includes("@")
  ) {
    req.session.inputData = {
      hasError: true,
      message: "Invalid Input please check data",
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,
    };

    req.session.save(function () {
      res.redirect("signup");
    });
    return;
  }

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

  if (existingUser) {
    console.log(existingUser);
    console.log("That User Already Exists");
    return res.redirect("/signup");
  }

  const user = {
    email: enteredEmail,
    password: hashedPassword,
  };

  await db.getDb().collection("users").insertOne(user);

  res.redirect("/login");
});

router.post("/login", async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredPassword = userData.password;

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

  if (!existingUser) {
    console.log("Could not log in");
    return res.redirect("/login");
  }

  const passwordsAreEqual = await bcrypt.compare(
    enteredPassword,
    existingUser.password
  ); //yields a boolean value

  if (!passwordsAreEqual) {
    console.log("Could not log in Passwords are not Equal");
    return res.redirect("/login");
  }
  req.session.user = {
    id: existingUser._id,
    email: existingUser.email,
    isAdmin: existingUser.isAdmin,
  };
  console.log(req.session.user);
  req.session.isAuthenticated = true;
  req.session.save(function () {});

  res.redirect("/transaction");
  console.log("User is Authenticated");
});

router.get("/admin", async function (req, res) {
  //   console.log(req.session.isAuthenticated);
  if (!res.locals.isAuth) {
    return res.status(401).render("401");
  }
  const userId = req.session.user.id;
  //   console.log(userId);

  const user = await db
    .getDb()
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  if (!res.locals.isAdmin) {
    res.status(403).render("403");
  }
  res.render("admin");
});

router.get("/transaction", async function (req, res) {
  if (!res.locals.isAuth) {
    return res.status(401).render("401");
  }
  console.log("found user", res.locals);

  res.render("transaction");
});

router.post("/transaction", async function (req, res) {
  if (!res.locals.isAuth) {
    return res.redirect("/login");
  }

  const user = req.session.user;

  const transaction = {
    sender: user.email,
    recipient: req.body.recipient,
    amount: +req.body.amount,
  };
  // console.log(transaction);
  await db.getDb().collection("transaction").insertOne(transaction);
  res.redirect("/success");
});

router.get("/success", function (req, res) {
  res.render("success");
});

router.post("/logout", function (req, res) {
  req.session.user = null;
  req.session.isAuthenticated = false;
  res.redirect("/");
});

module.exports = router;
