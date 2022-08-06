const elems = {
  ppf: document.getElementById('ppf'),
  bin: document.getElementById('bin'),
  sha1: document.getElementById('sha1'),
  ppfFile: document.getElementById('ppf-file'),
  binFile: document.getElementById('bin-file'),
  sha1File: document.getElementById('sha1-file'),
  ppfStatus: document.getElementById('ppf-status'),
  binStatus: document.getElementById('bin-status'),
  sha1Status: document.getElementById('sha1-status'),
  disc: document.getElementById('disc'),
  button: document.getElementById('apply-button'),
  download: document.getElementById('download'),
  notification: document.getElementById('notification'),
  notificationText: document.getElementById('notification-text'),
}

function dragOverListener(event) {
  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'copy'
  {[elems.ppf, elems.bin, elems.sha1].forEach(function(elem) {
    elem.classList.add('active')
  })}
}

function dragLeaveListener(event) {
  removeActiveClasses()
}

function removeActiveClasses() {
  [elems.ppf, elems.bin, elems.sha1].forEach(function(elem) {
    elem.classList.remove('active')
  })
}

const selectedFiles = [{}, {}, {}]
const fileMap = new Map()
fileMap.set(elems.ppf, selectedFiles[0])
fileMap.set(elems.bin, selectedFiles[1])
fileMap.set(elems.sha1, selectedFiles[2])
fileMap.set(elems.ppfFile, selectedFiles[0])
fileMap.set(elems.binFile, selectedFiles[1])
fileMap.set(elems.sha1File, selectedFiles[2])

const statusMap = new Map()
statusMap.set(elems.ppf, [elems.ppfStatus, elems.ppfFile])
statusMap.set(elems.bin, [elems.binStatus, elems.binFile])
statusMap.set(elems.sha1, [elems.sha1Status, elems.sha1File])

function updateStatus() {
  if (selectedFiles[0].file && selectedFiles[1].file) {
    elems.button.disabled = false
  }
}

function fileChange(event) {
  for (let i = 0; i < event.target.files.length; i++) {
    const file = event.target.files[i]
    fileMap.get(event.target).file = file
  }
  updateStatus()
}

function dropListener(event) {
  event.preventDefault()
  event.stopPropagation()
  removeActiveClasses()
  let files
  if (event.dataTransfer.items) {
    files = Array.prototype.filter.call(
      event.dataTransfer.items,
      function(item) {
        return item.kind === 'file'
      }
    ).map(function(item) {
      return item.getAsFile()
    })
  } else {
    files = event.dataTransfer.files
  }
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    let target
    if (/.*\.[pP][pP][fF]$/.test(file.name)) {
      target = elems.ppf
    } else if (/.*\.[bB][iI][nN]$/.test(file.name)) {
      target = elems.bin
    } else if (/.*\.[sS][hH][aA]1$/.test(file.name)) {
      target = elems.sha1
    }
    fileMap.get(target).file = file
    if (target === elems.sha1) {
      updateDiscSelection()
    }
    const status = statusMap.get(target)
    status[0].innerText = file.name
    status[1].style.display = 'none'
    updateStatus()
  }
}

document.body.addEventListener('dragover', dragOverListener)
document.body.addEventListener('dragleave', dragLeaveListener)
document.body.addEventListener('drop', dropListener)

{[elems.ppfFile, elems.binFile, elems.sha1File].forEach(function(slot) {
  slot.addEventListener('change', fileChange)
})}

function updateDiscSelection() {
  while (elems.disc.firstChild) {
    parent.removeChild(elems.disc.firstChild)
  }
  const reader = new FileReader()
  reader.addEventListener('load', function() {
    const lines = this.result.split('\r\n')
    lines.pop()
    if (!lines.every(function(line) {
      return /^[a-f0-9]{40} \*.*$/.test(line)
    })) {
      notify('Invalid SHA1 file')
    } else {
      lines.forEach(function(line) {
        if (!/\.cue$/.test(line)) {
          const digest = line.match(/^([a-f0-9]{40})/)[1]
          const disc = line.match(/^[a-f0-9]{40} \*(.*)$/)[1]
          const option = document.createElement('option')
          option.value = digest
          option.innerText = disc
          elems.disc.appendChild(option)
        }
      })
      elems.disc.classList.add('visible')
    }
  })
  reader.readAsBinaryString(selectedFiles[2].file)
}

elems.sha1File.addEventListener('change', updateDiscSelection)

function getUrl() {
  const url = new URL(window.location.href)
  if (url.protocol === 'file:') {
    return 'file://'
      + window.location.pathname.split('/').slice(0, -1).join('/') + '/'
  } else {
    return window.location.protocol + '//' + window.location.host + '/'
  }
}

elems.button.addEventListener('click', function(event) {
  let filesRead = 0
  const files = new Array(2)
  const name = selectedFiles[1].file.name
  selectedFiles.slice(0, 2).forEach(function(o, index) {
    if (o.file) {
      const reader = new FileReader()
      reader.addEventListener('load', function() {
        files[index] = this.result
        if (++filesRead == files.length) {
          worker.postMessage({
            url: getUrl(),
            ppf: files[0],
            bin: files[1],
            sha1: elems.disc.value,
            name: name,
          }, files)
        }
      })
      reader.readAsArrayBuffer(o.file)
    }
  })
})

function createWorker() {
  const url = new URL(window.location.href)
  if (url.protocol === 'file:') {
    const source = '(' + ppfWorker.toString() + ')()'
    return new Worker(
      URL.createObjectURL(new Blob([source], {
        type: 'text/javascript',
      }))
    )
  }
  return new Worker('worker.js')
}

let animationDone = true

const worker = createWorker()
worker.addEventListener('message', function(message) {
  message = message.data
  if (message.bin) {
    elems.download.download = message.name
    const url = URL.createObjectURL(new Blob([message.bin], {
      type: 'application/octet-binary',
    }))
    elems.download.href = url
    elems.download.click()
    URL.revokeObjectURL(url)
  } else if (message.error) {
    notify(message.error)
  }
})

function notify(message) {
  if (animationDone) {
    animationDone = false
    elems.notificationText.innerText = message
    elems.notification.classList.add('show')
    elems.notification.classList.remove('hide')
    setTimeout(function() {
      elems.notification.classList.add('hide')
    }, 5000)
    setTimeout(function() {
      elems.notification.classList.remove('show')
      animationDone = true
    }, 7000)
  }
}
