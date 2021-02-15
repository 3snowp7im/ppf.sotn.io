const elems = {
  ppf: document.getElementById('ppf'),
  bin: document.getElementById('bin'),
  ppfFile: document.getElementById('ppf-file'),
  binFile: document.getElementById('bin-file'),
  ppfStatus: document.getElementById('ppf-status'),
  binStatus: document.getElementById('bin-status'),
  button: document.getElementById('apply-button'),
  download: document.getElementById('download'),
  notification: document.getElementById('notification'),
  notificationText: document.getElementById('notification-text'),
}

function dragOverListener(event) {
  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'copy'
  event.target.classList.add('active')
}

function dragLeaveListener(event) {
  event.target.classList.remove('active')
}

const selectedFiles = [{}, {}]
const fileMap = new Map()
fileMap.set(elems.ppf, selectedFiles[0])
fileMap.set(elems.bin, selectedFiles[1])
fileMap.set(elems.ppfFile, selectedFiles[0])
fileMap.set(elems.binFile, selectedFiles[1])

const statusMap = new Map()
statusMap.set(elems.ppf, [elems.ppfStatus, elems.ppfFile])
statusMap.set(elems.bin, [elems.binStatus, elems.binFile])

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
  let name
  let target = event.target
  if (!fileMap.get(event.target)) {
    target = event.target.parentElement
  }
  if (event.dataTransfer.items) {
    for (let i = 0; i < event.dataTransfer.items.length; i++) {
      const item = event.dataTransfer.items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        fileMap.get(target).file = file
        name = file.name
      }
    }
  } else {
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      const file = event.dataTransfer.files[i]
      fileMap.get(target).file = file
      name = file.name
    }
  }
  const status = statusMap.get(target)
  status[0].innerText = name
  status[1].style.display = 'none'
  event.target.classList.remove('active')
  updateStatus()
}

{[elems.ppf, elems.bin].forEach(function(slot) {
  slot.addEventListener('dragover', dragOverListener)
  slot.addEventListener('dragleave', dragLeaveListener)
  slot.addEventListener('drop', dropListener)
})}

{[elems.ppfFile, elems.binFile].forEach(function(slot) {
  slot.addEventListener('change', fileChange)
})}

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
  selectedFiles.forEach(function(o, index) {
    if (o.file) {
      const reader = new FileReader()
      reader.addEventListener('load', function() {
        files[index] = this.result
        if (++filesRead == files.length) {
          worker.postMessage({
            url: getUrl(),
            ppf: files[0],
            bin: files[1],
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
    if (animationDone) {
      animationDone = false
      elems.notificationText.innerText = message.error
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
})
