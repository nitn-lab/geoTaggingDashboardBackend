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

routes.post(
  "/get-district-engineers-by-filter",
  validate,
  controller.getDistrictEngineersByFilter
)



routes.post(
  "/get-block-engineers-by-filter",
  validate,
  controller.getBlockEngineersByFilter
)

routes.post(
  "/get-district-admin-by-filter",
  validate,
  controller.getDistrictAdminByFilter
)

routes.post(
  "/get-block-admin-by-filter",
  validate,
  controller.getBlockByAdminFilter
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

routes.post(
  "/add-scheme",
  validate,
  controller.add_scheme
)

routes.post(
  "/create-category",
  validate,
  controller.create_category
)

routes.get(
  "/get-categories",
  validate,
  controller.getCategories
)

routes.get(
  "/get-scheme",
  validate,
  controller.getSchemes
)

// get all district-engineer 
routes.get("/get-district-engineers", tokenValidation(), validate, controller.getDistrictEngineers);

routes.get("/get-block-engineers",tokenValidation(), validate, controller.getBlockEngineers);

routes.get("/get-assets",tokenValidation(), validate, controller.getAssets);

routes.put('/update-asset/:id',validate,controller.update_asset);

routes.put('/update-category/:id',validate,controller.update_category);

routes.put('/update-scheme/:id',validate,controller.update_scheme);

routes.delete('/delete-category/:id',validate,controller.delete_category);

routes.delete('/delete-scheme/:id',validate,controller.delete_scheme);

routes.put('/update-admin/:id/:level',validate,controller.update_admin); 

routes.put('/update-engineer/:id/:level',validate,controller.update_block_district_engineer); 

routes.get('/all-admin',validate,controller.getAllAdmin);

routes.post('/delete-assets',validate,controller.delete_assets);

routes.post('/delete-district-engineers',validate,controller.delete_district_engineers);

routes.post('/delete-block-engineers',validate,controller.delete_block_engineers);

routes.post('/delete-bulk-category',validate,controller.delete_bulk_category);

routes.post('/delete-bulk-scheme',validate,controller.delete_bulk_scheme);

routes.post('/delete-block-admin',validate,controller.delete_block_admin);

routes.post('/delete-district-admin',validate,controller.delete_district_admin);

routes.post('/create-financial-year',validate,controller.create_financial_year);

routes.get('/get-financial-year',tokenValidation(),controller.getFinancialyear);

routes.delete('/delete-financial-year',validate,controller.delete_financial_year);

routes.put('/update-financial-year/:id',validate,controller.update_financial_year)

routes.post('/get-all-engineers-by-filter',validate,controller.getDistrictAndBlockEngineersByFilter)

export default routes;
