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

  function sha1(input) {
    return crypto.subtle.digest('SHA-1', input).then(function(buf) {
      return new Uint8Array(buf)
    })
  }

  function patch(ppf, bin, name) {
    const ppfArray = new Uint8Array(ppf)
    const binArray = new Uint8Array(bin)
    try {
      apply(ppfArray, binArray)
      eccEdcCalc(binArray, binArray.length)
      this.postMessage({
        bin: bin,
        name: name,
      }, [bin])
    } catch (err) {
      this.postMessage({error: err.message})
    }
  }

  function handleMessage(message) {
    message = message.data
    loadBrowser(message.url)
    const ppf = message.ppf
    const bin = message.bin
    const name = message.name
    const self = this
    if (message.sha1) {
      const expected = Uint8Array.from(
        message.sha1.match(/.{2}/g).map(function(byte) {
          return parseInt(byte, 16)
        })
      )
      sha1(new Uint8Array(bin)).then(function(actual) {
        for (let i = 0; i < 20; i++) {
          if (actual[i] != expected[i]) {
            self.postMessage({error: 'Invalid BIN file'})
            return
          }
        }
        patch.call(self, ppf, bin, name)
      })
    } else {
      patch.call(self, ppf, bin, name)
    }
  }

  self.addEventListener('message', handleMessage)
}

if (typeof(window) === 'undefined') {
  ppfWorker()
}
