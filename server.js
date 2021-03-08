const express = require('express')
const cors = require('cors')
const ytdl = require('ytdl-core')
const app = express()

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

// Listen to port 
app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
