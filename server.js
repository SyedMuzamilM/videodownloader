const express = require('express')
const cors = require('cors')
const ytdl = require('ytdl-core')
const app = express()
const youtubedl = require('youtube-dl-exec')

const path = require('path')

app.use(cors())
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs')
app.use('/static', express.static(path.join(__dirname, 'public')))

const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
    res.render('index')
})

app.get('/downloads', (req, res) => {
    const URL = req.query.URL

    res.header('Content-Disposition', 'attachment; filename="video.mp4')

    ytdl(URL, {
        format: 'mp4'
    }).pipe(res)

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
