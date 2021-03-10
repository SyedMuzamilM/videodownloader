const express = require('express')
const cors = require('cors')
const ytdl = require('ytdl-core')
const youtubedl = require('youtube-dl-exec')
const ffmpeg = require('ffmpeg-static')

const app = express()

const path = require('path')
const cp = require('child_process');
const readline = require('readline');
const fs = require('fs')

app.use(cors())
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs')
app.use('/static', express.static(path.join(__dirname, 'public')))

const PORT = process.env.PORT || 3000

async function getHDVid(ref) {
        
    // const ref = 'https://www.youtube.com/watch?v=BsAmXFcQMQ4'

    let info = await ytdl.getInfo(ref)
    const title = info.player_response.videoDetails.title

    // keeps track of the start time audio and video downloaded and merged
    const tracker = {
        start: Date.now(),
        audio: { downloaded: 0, total: Infinity },
        video: { downloaded: 0, total: Infinity },
        merged: { frame: 0, speed: '0x', fps: 0 },
    }

    // Get audio and video streams
    const audio = ytdl(ref, { quality: 'highestaudio' })
    .on('progress', (_, downloaded, total) => {
        tracker.audio = { downloaded, total };
    });
    const video = ytdl(ref, { quality: 'highestvideo' })
    .on('progress', (_, downloaded, total) => {
        tracker.video = { downloaded, total };
    });

    // Prepare the progress bar
    let progressbarHandle = null
    let progressbarInterval = 1000

    const showProgress = () => {
        readline.cursorTo(process.stdout, 0);
        const toMB = i => (i / 1024 / 1024).toFixed(2);
    
        process.stdout.write(`Audio  | ${(tracker.audio.downloaded / tracker.audio.total * 100).toFixed(2)}% processed `);
        process.stdout.write(`(${toMB(tracker.audio.downloaded)}MB of ${toMB(tracker.audio.total)}MB).${' '.repeat(10)}\n`);
    
        process.stdout.write(`Video  | ${(tracker.video.downloaded / tracker.video.total * 100).toFixed(2)}% processed `);
        process.stdout.write(`(${toMB(tracker.video.downloaded)}MB of ${toMB(tracker.video.total)}MB).${' '.repeat(10)}\n`);
    
        process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
        process.stdout.write(`(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${' '.repeat(10)}\n`);
    
        process.stdout.write(`running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(2)} Minutes.`);
        readline.moveCursor(process.stdout, 0, -3);
    };

    // Start the ffmpeg child process
    const ffmpegProcess = cp.spawn(ffmpeg, [
        // Remove ffmpeg's console spamming
        '-loglevel', '8', '-hide_banner',
        // Redirect/Enable progress messages
        '-progress', 'pipe:3',
        // Set inputs
        '-i', 'pipe:4',
        '-i', 'pipe:5',
        // Map audio & video from streams
        '-map', '0:a',
        '-map', '1:v',
        // Keep encoding
        '-c:v', 'copy',
        // Define output file
        title + '.mkv',
    ], {
        windowsHide: true,
        stdio: [
        /* Standard: stdin, stdout, stderr */
        'inherit', 'inherit', 'inherit',
        /* Custom: pipe:3, pipe:4, pipe:5 */
        'pipe', 'pipe', 'pipe',
        ],
    });
    ffmpegProcess.on('close', () => {
        console.log('done');
        // Cleanup
        process.stdout.write('\n\n\n\n');
        clearInterval(progressbarHandle);
    });

    
    // Link streams
    // FFmpeg creates the transformer streams and we just have to insert / read data
    ffmpegProcess.stdio[3].on('data', chunk => {
        // Start the progress bar
        if (!progressbarHandle) progressbarHandle = setInterval(showProgress, progressbarInterval);
        // Parse the param=value list returned by ffmpeg
        const lines = chunk.toString().trim().split('\n');
        const args = {};
        for (const l of lines) {
        const [key, value] = l.split('=');
        args[key.trim()] = value.trim();
        }
        tracker.merged = args;
    });
    audio.pipe(ffmpegProcess.stdio[4]);
    video.pipe(ffmpegProcess.stdio[5])

}

app.get('/', (req, res) => {
    res.render('index')
})

app.get('/downloads', async (req, res) => {
    const URL = req.query.URL
    let info = await ytdl.getInfo(URL)

    // res.header('Content-Disposition', 'attachment; filename="video.mp4')
    // let format = ytdl.chooseFormat(info.formats, 140)
    // // console.log("Info: ", format)
    // await ytdl(URL, {
    //     format
    // }).pipe(res)
    let output = info.player_response.videoDetails.title
    getHDVid(URL)
    console.log(output)

    res.download(output + '.mkv', err => {
        if (err) throw err
        
        fs.unlinkSync(output + '.mkv')
    })
 

})

app.get('/info', async (req, res) => {
    const url = 'https://www.youtube.com/watch?v=BsAmXFcQMQ4'
    let info = await ytdl.getInfo(url)
    // console.log(info.player_response.streamingData.formats)
    const data = info.player_response
    const vidInfo = data.streamingData.adaptiveFormats
    const title = data.videoDetails.title
    const thumbnail = data.videoDetails.thumbnail.thumbnails[4].url
    
    res.render('info', {vidInfo, title, thumbnail})
})

app.get('/v2/downloads/', async (req, res) => {

    const output = await youtubedl('https://youtu.be/gXNdCWXO8AM', {
        dumpJson: true,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        referer: 'https://youtu.be/gXNdCWXO8AM'
})

    let title = output.title
    let thumbnail = output.thumbnails[4].url
    let formats = output.formats
    res.render('download', {title, thumbnail, formats})
})

// Listen to port 
app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
