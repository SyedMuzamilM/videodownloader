const URLInput = document.querySelector(".URL-input")
const submitBtn = document.querySelector(".submit")

submitBtn.addEventListener('click', () => {
    const URLValue = URLInput.value
    console.log(URLValue)

    send(URLValue)
})

function send(URL) {
  window.location.href = `/downloads?URL=${URL}`
}