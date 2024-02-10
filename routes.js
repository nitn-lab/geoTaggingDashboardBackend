import { Router } from "express";
import { body, header } from "express-validator";
import controller, { validate, fetchUserByEmailOrID } from "./controller.js";

const routes = Router({ strict: true });

// Token Validation Rule
const tokenValidation = (isRefresh = false) => {
  let refreshText = isRefresh ? "Refresh" : "Authorization";

  return [
    header("Authorization", `Please provide your ${refreshText} token`)
      .exists()
      .not()
      .isEmpty()
      .custom((value, { req }) => {
        if (!value.startsWith("Bearer") || !value.split(" ")[1]) {
          throw new Error(`Invalid ${refreshText} token`);
        }
        if (isRefresh) {
          req.headers.refresh_token = value.split(" ")[1];
          return true;
        }
        req.headers.access_token = value.split(" ")[1];
        return true;
      }),
  ];
};

// Register a new User
routes.post(
  "/signup",
  [
    body("name")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Name must not be empty.")
      .isLength({ min: 3 })
      .withMessage("Name must be at least 3 characters long")
      .escape(),
    body("email", "Invalid email address.")
      .trim()
      .isEmail()
      .custom(async (email) => {
        
        const isExist = await fetchUserByEmailOrID(email);
        if (isExist.length)
          throw new Error("A user already exists with this e-mail address");
        return true;
      }),
    body("password")
      .trim()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters long"),
  ],
  validate,
  controller.signup
);

// Login user through email and password
routes.post(
  "/login",
  [
    body("email", "Invalid email address.")
      .trim()
      .isEmail()
      .custom(async (email, { req }) => {
        const isExist = await fetchUserByEmailOrID(email);
        if (isExist.length === 0)
          throw new Error("Your email is not registered.");
        req.body.user = isExist[0];
        return true;
      }),
    body("password", "Incorrect Password").trim().isLength({ min: 4 }),
  ],
  validate,
  controller.login
);

// Get the user data by providing the access token
routes.get("/profile", tokenValidation(), validate, controller.getUser);

// Get new access and refresh token by providing the refresh token
routes.get(
  "/refresh",
  tokenValidation(true),
  validate,
  controller.refreshToken
);

// Add new district engineer
routes.post(
  "/add-district-engineer",
  [
    body("email", "Invalid email address.")
      .trim()
      .isEmail()
      .custom(async (email) => {
        const isExist = await fetchUserByEmailOrID(email);
        if (isExist.length)
          throw new Error("A user already exists with this e-mail address");
        return true;
      }),
    body("password")
      .trim()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters long"),
  ],
  validate,
  controller.district_engineer
);

//Add new block_engineer
routes.post(
    "/add-block-engineer",
    [
      body("email", "Invalid email address.")
        .trim()
        .isEmail()
        .custom(async (email) => {
          const isExist = await fetchUserByEmailOrID(email);
          if (isExist.length)
            throw new Error("A user already exists with this e-mail address");
          return true;
        }),
      body("password")
        .trim()
        .isLength({ min: 4 })
        .withMessage("Password must be at least 4 characters long"),
    ],
    validate,
    controller.block_engineer
  );

//Add new asset
routes.post(
    "/add-asset",
    validate,
    controller.add_assests
  );
routes.post(
  "/get-assets-by-filter",
  validate,
  controller.getAssetsByFilter
)

routes.get(
  "/fetchAllEngineers",
  validate,
  controller.getAllEngineers
)
// add district admin
routes.post(
    "/add-district-admin",
    validate,
    controller.add_district_admin
);

// add block admin
routes.post(
    "/add-block-admin",
    validate,
    controller.add_block_admin
)

// get all district-engineer 
routes.get("/get-district-engineers", tokenValidation(), validate, controller.getDistrictEngineers);

routes.get("/get-block-engineers",tokenValidation(), validate, controller.getBlockEngineers);

routes.get("/get-assets",tokenValidation(), validate, controller.getAssets);

routes.put('/update-asset/:id',validate,controller.update_asset)


export default routes;
