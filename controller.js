import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { validationResult, matchedData } from 'express-validator';
import { generateToken, verifyToken } from './tokenHandler.js';
import DB from './dbConnection.js';




const validation_result = validationResult.withDefaults({
    formatter: (error) => error.msg,
});

export const validate = (req, res, next) => {
    const errors = validation_result(req).mapped();
    if (Object.keys(errors).length) {
        return res.status(422).json({
            status: 422,
            errors,
        });
    }
    next();
};


// `select name,email,mobile,level,isAdmin,isMobileUser from block_admin where email=${email} union all select name,email,mobile,level,isAdmin,isMobileUser from  district_admin where email=${email}union all select name,email,mobile,level,isAdmin,isMobileUser from district_engineers where email=${email}union all select name,email,mobile,level,isAdmin,isMobileUser from block_engineers where email=${email};`
// If email already exists in database
export const fetchUserByEmailOrID = async (data, isEmail = true) => {
   
    let sql = 'SELECT * FROM `users` WHERE `email`=?';
    if (!isEmail)
        sql = 'SELECT * FROM `users` WHERE `id`=?';
    const [row] = await DB.execute(sql, [data]);
    // DB.end();
    return row;
};




export const fetchAllDistrictEngineers = async () => {
    let sql = 'SELECT `name`,`mobile`,`email`,`district` FROM `district_engineers`';
    const [row] = await DB.execute(sql);
    // DB.end();
    return row;
};

export const fetchAllBlockEngineers = async () => {
    let sql = 'SELECT `name`,`mobile`,`email`,`district`, `block` FROM `block_engineers`';
    const [row] = await DB.execute(sql);
    return row;
}

export const fetchAllAdmin = async () => {
    let sql = 'select id,name,email,mobile,district,block,password,level,isAdmin,isMobileUser,isSuperAdmin from block_admin union all select  id,name,email,mobile,district,block,password,level,isAdmin,isMobileUser,isSuperAdmin from district_admin;';
    const [row] = await DB.execute(sql);
    return row;
}

export const fetchAllEngineers = async () => {
    let sql = 'select id,name,email,mobile,district,block,password,level,isAdmin,isMobileUser,isSuperAdmin from district_engineers union all select  id,name,email,mobile,district,block,password,level,isAdmin,isMobileUser,isSuperAdmin from block_engineers;';
    const [row] = await DB.execute(sql);
    return row;
}
export const fetchAllAssets = async () => {
    let sql = 'SELECT `asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images`,`scheme`,`financial_year`,`district`,`block`,`asset_tagging`, `asset_utilized_price` FROM `assets`';
    const [row] = await DB.execute(sql);
    return row;
}




export const fetchAssetsByDistrictOrBlock = async (data, isBlock) => {
   
    let sql = 'SELECT `asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images`,`scheme`,`financial_year`,`district`,`block`,`asset_tagging` FROM `assets` WHERE `district`=?';
    if (isBlock)
        sql = 'SELECT `asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images`,`scheme`,`financial_year`,`district`,`block`,`asset_tagging` FROM `assets` WHERE `block`=?';
    const [row] = await DB.execute(sql, [data]);
    // DB.end();
    return row;
};

export const fetchAssetsByIDOrAssetsTagging = async (data, idID) => {
   
    let sql = 'SELECT `asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images`,`scheme`,`financial_year`,`district`,`block`,`asset_tagging` FROM `assets` WHERE `asset_tagging`=?';
    if (idID)
        sql = 'SELECT `asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images`,`scheme`,`financial_year`,`district`,`block`,`asset_tagging` FROM `assets` WHERE `id`=?';
    const [row] = await DB.execute(sql, [data]);
    // DB.end();
    return row;
};





export default {

    signup: async (req, res, next) => {
        try {
            const { name, email, password } = matchedData(req);

            const saltRounds = 10;
            // Hash the password
            const hashPassword = await bcrypt.hash(password, saltRounds);

            // Store user data in the database
            const [result] = await DB.execute(
                'INSERT INTO `users` (`name`,`email`,`password`) VALUES (?,?,?)',
                [name, email, hashPassword]
            );
            
            res.status(201).json({
                status: 201,
                message: 'You have been successfully registered.',
                user_id: result.insertId,
            });
            // DB.end();
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },

    login: async (req, res, next) => {
        try {
            const { user, password } = req.body;
            // console.log(user, password)
            const verifyPassword = await bcrypt.compare(
                password,
                user.password
            );
            if (!verifyPassword) {
                return res.status(422).json({
                    status: 422,
                    message: 'Incorrect password!',
                });
            }

            // Generating Access and Refresh Token
            const access_token = generateToken({ id: user.id });
            const refresh_token = generateToken({ id: user.id }, false);

            const md5Refresh = createHash('md5')
                .update(refresh_token)
                .digest('hex');

            // Storing refresh token in MD5 format
            const [result] = await DB.execute(
                'INSERT INTO `refresh_tokens` (`user_id`,`token`) VALUES (?,?)',
                [user.id, md5Refresh]
            );
            // Storing refresh token in MD5 format
            
                        // 
            // DB.end();
            let user_data;
            let dataLength;

            // check user is super admin or not
            let email=user.email;
            
            const isSuperAdmin = await DB.execute(`SELECT isSuperAdmin FROM users WHERE email='${email}';`)
            // console.log(isSuperAdmin[0][0]['isSuperAdmin'])

            if(isSuperAdmin[0][0]['isSuperAdmin']===0){
            let query = `select name,email,mobile,district,block,level,isSuperAdmin,isAdmin,isMobileUser from block_admin where email='${email}'
            union all select name,email,mobile,district,block,level,isSuperAdmin,isAdmin,isMobileUser from district_admin where email='${email}'
            union all select name,email,mobile,district,block,level,isSuperAdmin,isAdmin,isMobileUser from district_engineers where email='${email}'
            union all select name,email,mobile,district,block,level,isSuperAdmin,isAdmin,isMobileUser from block_engineers where email='${email}';`;
            user_data = await DB.execute(query);
            dataLength = user_data[0].length
            }
            else{
                user_data = await fetchUserByEmailOrID(user.id, false);
                dataLength=Object.keys(user_data).length
            }
            
            // console.log("user_data",Object.keys(user_data).length)
            // console.log(user_data)
            if (dataLength !== 1) {
                return res.status(404).json({
                    status: 404,
                    message: 'User not found',
                });
            }
            // console.log("user_data",user_data)
            if (!result.affectedRows) {
                throw new Error('Failed to whitelist the refresh token.');
            }
            res.json({
                status: 200,
                access_token,
                refresh_token,

                response:user_data[0]
            });
            // DB.end();
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },

    getUser: async (req, res, next) => {
        try {
            // Verify the access token
            const data = verifyToken(req.headers.access_token);
            if (data?.status) return res.status(data.status).json(data);
            // fetching user by the `id` (column)
            const user = await fetchUserByEmailOrID(data.id, false);
            if (user.length !== 1) {
                return res.status(404).json({
                    status: 404,
                    message: 'User not found',
                });
            }
            res.json({
                status: 200,
                user: user[0],
            });
            // DB.end();
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },

    refreshToken: async (req, res, next) => {
        try {
            const refreshToken = req.headers.refresh_token;
            // Verify the refresh token
            const data = verifyToken(refreshToken, false);
            if (data?.status) return res.status(data.status).json(data);

            // Converting refresh token to md5 format
            const md5Refresh = createHash('md5')
                .update(refreshToken)
                .digest('hex');

            // Finding the refresh token in the database
            const [refTokenRow] = await DB.execute(
                'SELECT * from `refresh_tokens` WHERE token=?',
                [md5Refresh]
            );

            if (refTokenRow.length !== 1) {
                return res.json({
                    status: 401,
                    message: 'Unauthorized: Invalid Refresh Token.',
                });
            }

            // Generating new access and refresh token
            const access_token = generateToken({ id: data.id });
            const refresh_token = generateToken({ id: data.id }, false);

            const newMd5Refresh = createHash('md5')
                .update(refresh_token)
                .digest('hex');

            // Replacing the old refresh token to new refresh token
            const [result] = await DB.execute(
                'UPDATE `refresh_tokens` SET `token`=? WHERE `token`=?',
                [newMd5Refresh, md5Refresh]
            );
         
            if (!result.affectedRows) {
                throw new Error('Failed to whitelist the Refresh token.');
            }

            res.json({
                status: 200,
                access_token,
                refresh_token,
            });
            // DB.end();
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },

    // add district engineers 
    district_engineer: async (req, res, next) => {
        try {
            const { name, mobile, email,district,password } = req.body;
            // console.log("engineerName",name, mobile, email,district,password)
            const saltRounds = 10;
            // Hash the password
            const hashPassword = await bcrypt.hash(password, saltRounds);

            const [result1] = await DB.execute(
                'INSERT INTO `users` (`name`,`email`,`password`) VALUES (?,?,?)',
                [name, email, hashPassword]
            );
            // DB.end();
            // console.log('result1',result1)
            // Store user data in the database
            const [result] = await DB.execute(
                'INSERT INTO `district_engineers` (`name`,`mobile`,`email`,`district`,`password`) VALUES (?,?,?,?,?)',
                [name, mobile, email,district,hashPassword]
            );
            // console.log('result1',result1)
            res.status(201).json({
                status: 201,
                message: 'You have been successfully added a district engineer.',
                engineer_id: result.insertId,
            });
            // DB.end();
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },

    // add block engineers 
    block_engineer: async (req, res, next) => {
            try {
                const { name, mobile, email,district,block,password } = req.body;
                
                const saltRounds = 10;
                const hashPassword = await bcrypt.hash(password, saltRounds);
    
                const [result1] = await DB.execute(
                    'INSERT INTO `users` (`name`,`email`,`password`) VALUES (?,?,?)',
                    [name, email, hashPassword]
                );
                // console.log('result1',result1)
                // Store user data in the database
                const [result] = await DB.execute(
                    'INSERT INTO `block_engineers` (`name`,`mobile`,`email`,`district`,`block`,`password`) VALUES (?,?,?,?,?,?)',
                    [name, mobile, email,district,block,hashPassword]
                );
                // console.log('result1',result1)
                res.status(201).json({
                    status: 201,
                    message: 'You have been successfully added a block engineer.',
                    engineer_id: result.insertId,
                });
                DB.releaseConnection();
                // DB.end();
            } catch (err) {
                next(err);
            }
    },
    getDistrictEngineers: async (req, res, next) => {
        try {
            // Verify the access token
            const data = verifyToken(req.headers.access_token);
            if (data?.status) return res.status(data.status).json(data);
            const engineer = await fetchAllDistrictEngineers();
            // DB.end();
            if (engineer.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No District Engineer found',
                });
            }
            res.json({
                status: 200,
                engineer: engineer,
            });
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },
    getBlockEngineers: async (req, res, next) => {
        try {
            // Verify the access token
            const data = verifyToken(req.headers.access_token);
            if (data?.status) return res.status(data.status).json(data);
            const block_engineer = await fetchAllBlockEngineers();
            // DB.end();

            if (block_engineer.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No Block Engineer found',
                });
            }
            res.json({
                status: 200,
                block_engineer: block_engineer,
            });
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },

    getAllAdmin: async (req, res, next) => {
        try {
            // Verify the access token
            const data = verifyToken(req.headers.access_token);
            if (data?.status) return res.status(data.status).json(data);
            const all_admins = await fetchAllAdmin();
            // DB.end();

            if (all_admins.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No Admin Found',
                });
            }
            res.json({
                status: 200,
                all_admins: all_admins,
            });
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },

    ////////////////////////////////////////////     /* Assets /*    /////////////////////////////////////////////////////////

    // add new assests
    add_assests: async (req, res, next) => {
            try {
                const { asset_name, asset_category, asset_location,asset_price,asset_description,asset_notes,asset_images,scheme,financial_year,district,block} = req.body;

                const [result] = await DB.execute(
                    'INSERT INTO `assets` (`asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images`,`scheme`,`financial_year`,`district`,`block`) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                    [asset_name, asset_category, asset_location,asset_price,asset_description,asset_notes,asset_images,scheme,financial_year,district,block]
                );
                // console.log('result1',result1)
                res.status(201).json({
                    status: 201,
                    message: 'You have been successfully added a asset.',
                    asset_id: result.insertId,
                });
                // DB.end();
                DB.releaseConnection();
            } catch (err) {
                next(err);
            }
    },
    getAssets: async (req, res, next) => {
        try {
            // Verify the access token
            const data = verifyToken(req.headers.access_token);
            if (data?.status) return res.status(data.status).json(data);
            const assets = await fetchAllAssets();
            // DB.end();

            if (assets.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No Assest Found in DB.',
                });
            }
            res.json({
                status: 200,
                assets: assets,
            });
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },
    getAssetsByFilter: async (req, res, next) => {
        try {
            const filterdata = req.body;
            const Filterkeys=Object.entries(filterdata)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' and ');
            // console.log('filterkey',Filterkeys)
            
            const assests = await DB.execute(`SELECT asset_name, asset_category, asset_location,asset_price,asset_utilized_price,asset_description,asset_notes,asset_images,scheme,financial_year,district,block,asset_tagging FROM assets WHERE ${Filterkeys};`);

            if (assests[0].length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No Assest Found In DB.',
                });
            }
            res.json({
                status: 200,
                assests: assests[0],
            });
            // DB.end();
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },    

    getDistrictEngineersByFilter: async (req, res, next) => {
        try {
            const filterdata = req.body;
            const Filterkeys=Object.entries(filterdata)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' and ');
            // console.log('filterkey',Filterkeys)
            
            const engineers = await DB.execute(`SELECT id,name,email,mobile,district,block,password,level,isAdmin,isMobileUser,isSuperAdmin FROM district_engineers WHERE ${Filterkeys};`);

            if (engineers[0].length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No District Engineer Found In DB.',
                });
            }
            res.json({
                status: 200,
                engineers: engineers[0],
            });
            // DB.end();
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    }, 

    // block_engineers

    getBlockEngineersByFilter: async (req, res, next) => {
        try {
            const filterdata = req.body;
            const Filterkeys=Object.entries(filterdata)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' and ');
            // console.log('filterkey',Filterkeys)
            
            const block_engineers = await DB.execute(`SELECT id,name,email,mobile,district,block,password,level,isAdmin,isMobileUser,isSuperAdmin FROM block_engineers WHERE ${Filterkeys};`);

            if (block_engineers[0].length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No Block Engineer Found In DB.',
                });
            }
            res.json({
                status: 200,
                block_engineers: block_engineers[0],
            });
            // DB.end();
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },
    update_asset: async (req, res, next) => {
        try {
            // const { asset_name, asset_category, asset_location,asset_price,asset_description,asset_notes,asset_images} = req.body;
            const updatedData = req.body;
            const assetId = req.params.id;
            const convertedString = Object.entries(updatedData)
            .map(([key, value]) => `${key}="${value}"`)
            .join(', ');

            // console.log(convertedString)

            const [result] = await DB.execute(`UPDATE assets SET ${convertedString} WHERE id = ${assetId}`);

            // console.log('result1',result1)
            res.status(201).json({
                status: 201,
                message: 'You have been successfully updated a asset.',
                asset_id: result.insertId,
            });
            DB.releaseConnection();

        } catch (err) {
            next(err);
        }
    },

    // add district admin 
    add_district_admin: async (req, res, next) => {
        try {
            const { name, email, mobile, district, password } = req.body;

            const saltRounds = 10;

            const hashPassword = await bcrypt.hash(password, saltRounds);

            const [result1] = await DB.execute(
                'INSERT INTO `users` (`name`,`email`,`password`) VALUES (?,?,?)',
                [name, email, hashPassword]
            );

            const [result] = await DB.execute(
                'INSERT INTO `district_admin` (`name`,`email`,`mobile`,`district`,`password`) VALUES (?,?,?,?,?)',
                [name, email, mobile, district,hashPassword]
            );

            res.status(201).json({
                status: 201,
                message: 'You have been successfully added a district admin.',
                engineer_id: result.insertId,
            });
            DB.releaseConnection();
        } catch (err) {
            DB.releaseConnection();
            next(err);
        }
    },
    // add block admin
    add_block_admin: async (req, res, next) => {
        try {
            const { name, email, mobile, district, block, password } = req.body;
            
            const saltRounds = 10;
            
            const hashPassword = await bcrypt.hash(password, saltRounds);

            const [result1] = await DB.execute(
                'INSERT INTO `users` (`name`,`email`,`password`) VALUES (?,?,?)',
                [name, email, hashPassword]
            );

            const [result] = await DB.execute(
                'INSERT INTO `block_admin` (`name`,`email`,`mobile`,`district`,`block`,`password`) VALUES (?,?,?,?,?,?)',
                [name, email, mobile, district,block,hashPassword]
            );
        
            res.status(201).json({
                status: 201,
                message: 'You have been successfully added a block admin.',
                block_admin_id: result.insertId,
            });

             DB.releaseConnection();
        } catch (err) {
            // DB.end();
             DB.releaseConnection();
            next(err);
        }
    },

    getAllEngineers: async (req, res, next) => {
        try {
            // Verify the access token
            const data = verifyToken(req.headers.access_token);
            if (data?.status) return res.status(data.status).json(data);
            const all_engineers = await fetchAllEngineers();
            // DB.end();

            if (all_engineers.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No Engineer Found',
                });
            }
            res.json({
                status: 200,
                engineers: all_engineers,
            });
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },

    update_admin: async (req, res, next) => {
        try {
            // const { asset_name, asset_category, asset_location,asset_price,asset_description,asset_notes,asset_images} = req.body;
            const updatedData = req.body;
            const adminID = req.params.id;
            const level = req.params.level;
            const convertedString = Object.entries(updatedData)
            .map(([key, value]) => `${key}="${value}"`)
            .join(', ');

            // console.log(convertedString)
            let result=[]
            let admin_level=""
            if(level==='1'){
                result = await DB.execute(`UPDATE district_admin SET ${convertedString} WHERE id = ${adminID}`);
                admin_level="district"
            }
            else if(level==='2'){
                 result = await DB.execute(`UPDATE block_admin SET ${convertedString} WHERE id = ${adminID}`);
                 admin_level="block"
            }
            // console.log("level",level,typeof(level))

            res.status(201).json({
                status: 201,
                message: `You have been successfully updated a ${admin_level} admin.`,
                updatedID: result.id
            });
            // DB.releaseConnection();

        } catch (err) {
            next(err);
        }
    },
    update_block_district_engineer: async (req, res, next) => {
        try {
            // const { asset_name, asset_category, asset_location,asset_price,asset_description,asset_notes,asset_images} = req.body;
            const updatedData = req.body;
            const engineerID = req.params.id;
            const level = req.params.level;
            const convertedString = Object.entries(updatedData)
            .map(([key, value]) => `${key}="${value}"`)
            .join(', ');

            // console.log(convertedString)
            let result=[]
            let engineer_level=""
            if(level==='3'){
                result = await DB.execute(`UPDATE district_engineers SET ${convertedString} WHERE id = ${engineerID}`);
                engineer_level="district"
            }
            else if(level==='4'){
                 result = await DB.execute(`UPDATE block_engineers SET ${convertedString} WHERE id = ${engineerID}`);
                 engineer_level="block"
            }
            // console.log("level",level,typeof(level))

            res.status(201).json({
                status: 201,
                message: `You have been successfully updated a ${engineer_level} engineer.`,
                updatedID: result.id
            });
            // DB.releaseConnection();

        } catch (err) {
            next(err);
        }
    },
    add_scheme: async (req, res, next) => {
        try {
            const { scheme_name, financial_year } = req.body;
            


            const [result] = await DB.execute(
                'INSERT INTO `scheme` (`scheme_name`,`financial_year`) VALUES (?,?)',
                [scheme_name, financial_year]
            );
        
            res.status(201).json({
                status: 201,
                message: 'You have been added a scheme.',
                block_admin_id: result.insertId,
            });

             DB.releaseConnection();
        } catch (err) {
            // DB.end();
             DB.releaseConnection();
            next(err);
        }
    },
   
    create_category: async (req, res, next) => {
        try {
            const { category_name  } = req.body;
            


            const [result] = await DB.execute(
                'INSERT INTO `category` (`category_name`) VALUES (?)',
                [category_name]
            );
        
            res.status(201).json({
                status: 201,
                message: 'You have been created a category.',
                block_admin_id: result.insertId,
            });

             DB.releaseConnection();
        } catch (err) {
            // DB.end();
             DB.releaseConnection();
            next(err);
        }
    },

    getSchemes: async (req, res, next) => {
        try {
            // Verify the access token
            const data = verifyToken(req.headers.access_token);
            if (data?.status) return res.status(data.status).json(data);
            const schemes = await DB.execute('select id,scheme_name,financial_year from scheme;');
            // DB.end();

            if (schemes[0].length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No Scheme Found in DB.',
                });
            }
            res.json({
                status: 200,
                schemes: schemes[0],
            });
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },
    getCategories: async (req, res, next) => {
        try {
            // Verify the access token
            const data = verifyToken(req.headers.access_token);
            if (data?.status) return res.status(data.status).json(data);
            const Categories = await DB.execute('select id,category_name from category;');
            // DB.end();

            if (Categories[0].length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No Category Found in DB.',
                });
            }
            res.json({
                status: 200,
                Categories: Categories[0],
            });
            DB.releaseConnection();
        } catch (err) {
            next(err);
        }
    },



};
