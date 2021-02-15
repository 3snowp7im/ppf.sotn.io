function ppfWorker() {

  let apply
  let eccEdcCalc

  function loadBrowser(url) {
    importScripts(
      url + 'ppf.js/ecc-edc-recalc-js/ecc-edc-recalc-js.js',
      url + 'ppf.js/ppf.js',
    )
    apply = self.ppf.apply
    eccEdcCalc = self.eccEdcCalc
  }

  function handleMessage(message) {
    message = message.data
    loadBrowser(message.url)
    try {
      const ppf = new Uint8Array(message.ppf)
      const bin = new Uint8Array(message.bin)
      apply(ppf, bin)
      eccEdcCalc(bin, bin.length)
      this.postMessage({
        bin: message.bin,
        name: message.name,
      }, [message.bin])
    } catch (err) {
      this.postMessage({error: err.message})
    }
  }

  self.addEventListener('message', handleMessage)
}

if (typeof(window) === 'undefined') {
  ppfWorker()
}
