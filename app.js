import express from 'express';
import dbConnection from './dbConnection.js';
import routes from './routes.js';
import cors from 'cors';
import multer from 'multer';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { generateToken, verifyToken } from './tokenHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
app.use(cors());
const port = process.env.PORT || 8080;

// Middleware to parse JSON requests
app.use(express.json());



const upload = multer({ dest: 'videos/' });

// Serve static files (videos)
app.use('/videos', express.static(path.join(__dirname, 'videos')));
const sanitizeFilename = (filename) => {
    return filename.replace(/[^\w\s.\-]/gi, ''); 
};
// Endpoint for uploading videos
// app.post('/upload', upload.single('video'), (req, res) => {
//     console.log(req.file)
//     let { originalname, path: tempPath } = req.file;   
//     if (!req.file || path.extname(req.file.originalname).toLowerCase() !== '.mp4') {
//         // If no file uploaded or file extension is not .mp4
//         return res.status(400).send('Only .mp4 files are allowed');
//     }
//     originalname = new Date().getDate()+new Date().getTime()+'_'+sanitizeFilename(originalname)
//     let targetPath = path.join(__dirname, 'videos', originalname);
//     fs.rename(tempPath, targetPath, err => {
//         if (err) {
//             console.error(err);
//             res.status(500).send('Error uploading video');
//         } else {
//             let ress={"Response":'Video uploaded successfully',"fileName":originalname}
//             res.send(ress);
//         }
//     });
// });


const videosDirectory = path.join(__dirname, 'uploads');

// Endpoint to retrieve uploaded videos
app.get('/videos/:filename', (req, res) => {
    // console.log("/videossss/ function")
    // const data = verifyToken(req.headers.access_token);
    // if (data?.status) return res.status(data.status).json(data);
    const filename = req.params.filename;
    const videoPath = path.join(videosDirectory, filename);
    console.log(videoPath)
    if (fs.existsSync(videoPath)) {
        res.setHeader('Content-Type', 'video/mp4');
        const videoStream = fs.createReadStream(videoPath);
        videoStream.pipe(res);
    } else {
        res.status(404).send('Video not found');
    }
});

app.delete('/delete/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error deleting video');
        } else {
            let response = {"Response": 'Video deleted successfully', "fileName": fileName}
            res.send(response);
        }
    });
});


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'videos/'); 
    },
    filename: function (req, file, cb) {
        console.log("fileNN",file)
        let originalname = file.originalname
      cb(null, originalname); 
    }
  });

const _upload = multer({ storage: storage });

app.post('/upload-video', _upload.single('file'), (req, res) => {
    console.log("filename",req)
    if (!req.file || path.extname(req.file.originalname).toLowerCase() !== '.mp4') {
        return res.status(400).send('Only .mp4 files are allowed');
    }
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    // let ress=
    res.status(201).json({
        Response:'Video uploaded successfully',
        fileName:new Date().getDate()+new Date().getTime()+'_'+sanitizeFilename(req.file.originalname)
        });
    // res.send('File uploaded successfully.');
  });

const imageDirectory = path.join(__dirname, 'images');  
app.get('/image/:filename', (req, res) => {
    // console.log("/videossss/ function")
    // const data = verifyToken(req.headers.access_token);
    // if (data?.status) return res.status(data.status).json(data);
    const filename = req.params.filename;
    const imagePath = path.join(imageDirectory, filename);
    console.log(imagePath)
    if (fs.existsSync(imagePath)) {
        // res.setHeader('Content-Type', 'video/mp4');
        const imagesStream = fs.createReadStream(imagePath);
        imagesStream.pipe(res);
    } else {
        res.status(404).send('Image not found');
    }
});


  const Image_storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'images/') // Destination folder for uploaded files
    },
    filename: function (req, file, cb) {
      // Keep original file name
      console.log("bjasfgui",file)
      cb(null, file.originalname);
    }
  });
  
  // Set up multer middleware
  const upload_images = multer({ storage: Image_storage });
  
  // Define route for uploading images
  app.post('/upload-images', upload_images.array('images', 5), (req, res) => {
    // 'images' should match the name attribute in your form
    console.log("files",req.files)
  
    // Array of uploaded files
    const files = req.files;
  
    if (!files) {
      return res.status(400).send('No files were uploaded.');
    }
  
    // Process files, e.g., save to database or do further processing
    res.send('Files uploaded successfully.');
  });
  
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.use('/api', routes);
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';
    res.status(err.statusCode).json({
        message: err.message,
    });
});

// If database is connected successfully, then run the server
dbConnection
    .getConnection()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch((err) => {
        console.log(`Failed to connect to the database: ${err.message}`);
    });
