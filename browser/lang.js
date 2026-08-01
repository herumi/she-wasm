(function () {
  let lang = new URLSearchParams(location.search).get('lang')
  if (lang !== 'en' && lang !== 'ja') {
    try {
      lang = localStorage.getItem('lang')
    } catch (e) {
    }
  }
  if (lang !== 'en' && lang !== 'ja') {
    lang = (navigator.language || '').startsWith('ja') ? 'ja' : 'en'
  }
  document.documentElement.setAttribute('data-lang', lang)
  document.documentElement.setAttribute('lang', lang)
})()

function toggleLang () {
  const lang = document.documentElement.getAttribute('data-lang') === 'ja' ? 'en' : 'ja'
  document.documentElement.setAttribute('data-lang', lang)
  document.documentElement.setAttribute('lang', lang)
  try {
    localStorage.setItem('lang', lang)
  } catch (e) {
  }
}
