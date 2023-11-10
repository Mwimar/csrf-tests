const path = require("path");

const express = require("express");

const session = require("express-session");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;

const mongodbStore = require("connect-mongodb-session");

const siteRoutes = require("./routes/site");

const db = require("./data/database");

const MongoDBStore = mongodbStore(session);

const app = express();

const sessionStore = new MongoDBStore({
  uri: "mongodb://localhost:27017",
  databaseName: "security",
  collection: "sessions",
});

app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true })); //parsing incoming request bodies
app.use(express.json());

app.use(
  session({
    secret: "super-secret",
    resave: false,
    saveUnitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 2 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(express.static("public"));

app.use(async function (req, res, next) {
  const user = req.session.user;
  const isAuth = req.session.isAuthenticated;

  if (!user || !isAuth) {
    return next();
  }

  const userDoc = await db
    .getDb()
    .collection("users")
    .findOne({ _id: new ObjectId(user.id) });
  const isAdmin = userDoc.isAdmin;

  res.locals.isAuth = isAuth;
  res.locals.isAdmin = isAdmin;

  next();
});

app.use(siteRoutes);

app.use(function (error, req, res, next) {
  console.log(error);
  res.status(500).render("500");
});

db.connectToDatabase().then(function () {
  app.listen(3000);
});
