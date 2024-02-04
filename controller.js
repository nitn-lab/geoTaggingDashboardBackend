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

// If email already exists in database
export const fetchUserByEmailOrID = async (data, isEmail = true) => {
   
    let sql = 'SELECT * FROM `users` WHERE `email`=?';
    if (!isEmail)
        sql = 'SELECT `id` ,`name`, `email` FROM `users` WHERE `id`=?';
    const [row] = await DB.execute(sql, [data]);
    return row;
};

export const fetchAllDistrictEngineers = async () => {
    let sql = 'SELECT `engineer_name`,`mobile`,`email`,`district` FROM `district_engineers`';
    const [row] = await DB.execute(sql);
    return row;
};

export const fetchAllBlockEngineers = async () => {
    let sql = 'SELECT `engineer_name`,`mobile`,`email`,`district`, `block` FROM `block_engineers`';
    const [row] = await DB.execute(sql);
    return row;
}

export const fetchAllAssets = async () => {
    let sql = 'SELECT `asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images` FROM `assets`';
    const [row] = await DB.execute(sql);
    return row;
}

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
        } catch (err) {
            next(err);
        }
    },

    login: async (req, res, next) => {
        try {
            const { user, password } = req.body;
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

            if (!result.affectedRows) {
                throw new Error('Failed to whitelist the refresh token.');
            }
            res.json({
                status: 200,
                access_token,
                refresh_token,
            });
            // DB.end();
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
        } catch (err) {
            next(err);
        }
    },

    // add district engineers 
    district_engineer: async (req, res, next) => {
        try {
            const { engineer_name, mobile, email,district,password } = req.body;
            // console.log("engineerName",engineer_name, mobile, email,district,password)
            const saltRounds = 10;
            // Hash the password
            const hashPassword = await bcrypt.hash(password, saltRounds);

            const [result1] = await DB.execute(
                'INSERT INTO `users` (`name`,`email`,`password`) VALUES (?,?,?)',
                [engineer_name, email, hashPassword]
            );
            // console.log('result1',result1)
            // Store user data in the database
            const [result] = await DB.execute(
                'INSERT INTO `district_engineers` (`engineer_name`,`mobile`,`email`,`district`,`password`) VALUES (?,?,?,?,?)',
                [engineer_name, mobile, email,district,hashPassword]
            );
            // console.log('result1',result1)
            res.status(201).json({
                status: 201,
                message: 'You have been successfully added a district engineer.',
                engineer_id: result.insertId,
            });
            // DB.end();
        } catch (err) {
            next(err);
        }
    },

    // add block engineers 
    block_engineer: async (req, res, next) => {
            try {
                const { engineer_name, mobile, email,district,block,password } = req.body;
                
                const saltRounds = 10;
                const hashPassword = await bcrypt.hash(password, saltRounds);
    
                const [result1] = await DB.execute(
                    'INSERT INTO `users` (`name`,`email`,`password`) VALUES (?,?,?)',
                    [engineer_name, email, hashPassword]
                );
                // console.log('result1',result1)
                // Store user data in the database
                const [result] = await DB.execute(
                    'INSERT INTO `block_engineers` (`engineer_name`,`mobile`,`email`,`district`,`block`,`password`) VALUES (?,?,?,?,?,?)',
                    [engineer_name, mobile, email,district,block,hashPassword]
                );
                // console.log('result1',result1)
                res.status(201).json({
                    status: 201,
                    message: 'You have been successfully added a block engineer.',
                    engineer_id: result.insertId,
                });
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
        } catch (err) {
            next(err);
        }
    },
    // add new assests
    add_assests: async (req, res, next) => {
            try {
                const { asset_name, asset_category, asset_location,asset_price,asset_description,asset_notes,asset_images} = req.body;

                const [result] = await DB.execute(
                    'INSERT INTO `assets` (`asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images`) VALUES (?,?,?,?,?,?,?)',
                    [asset_name, asset_category, asset_location,asset_price,asset_description,asset_notes,asset_images]
                );
                // console.log('result1',result1)
                res.status(201).json({
                    status: 201,
                    message: 'You have been successfully added a asset.',
                    asset_id: result.insertId,
                });
                // DB.end();
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

            // const [result] = await DB.execute(
            //     'INSERT INTO `assets` (`asset_name`, `asset_category`, `asset_location`,`asset_price`,`asset_description`,`asset_notes`,`asset_images`) VALUES (?,?,?,?,?,?,?)',
            //     [asset_name, asset_category, asset_location,asset_price,asset_description,asset_notes,asset_images]
            // );
            // console.log('result1',result1)
          
            // DB.end();
        } catch (err) {
            next(err);
        }
}, 
};
