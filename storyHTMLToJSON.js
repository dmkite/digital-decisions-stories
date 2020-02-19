const story = require('./test')


const getStoryReady = story => {
  story = story.split('</tw-passagedata>')
  return story.map((p, i) => {
    // if(i !== 0) return
    const closingBrackIdx = p.indexOf('>') + 1
    const content = p.substring(closingBrackIdx)
    // console.log(passage)
    const tag = p.substring(0, closingBrackIdx)
    // console.log(tag)
    // console.log(tag)
    let name = tag.split('name="')[1]
    if (!name) return '|||||||||||||||||||||||||||name'
    name = name.substring(0, name.indexOf('"'))

    let id = tag.split('pid="')[1]
    if (!id) return '|||||||||||||||||||||||||||id'
    id = id.substring(0, id.indexOf('"'))
    return { id, name, content }
  })
}


const passages = getStoryReady(story) //story.split('},{')

const result = passages.map((pass, i) => {
  if (!pass || !pass.content) return
  // if(i !== 3) return


  // const meta = handleMeta(pass.split('content":[')[0])
  const content = pass.content //pass.split('content":[')[1] 
  const paragraphStarts = content.split('\n')
  let formatted = paragraphStarts.reduce((acc, p, i) => {
    if (shouldSkip(p)) return acc

    if (i === 0) {
      return [{ JSXType: 'text', linksTo: null, content: p, }]
    }
    else {
      return [...acc, { JSXType: 'text:paragraphStart', linksTo: null, content: p.trim(), }]
    }


  }, [])
  let passage = { id: pass.id, name: pass.name, content: formatted }
  handleActionLinks(passage)
  handleAliasLinks(passage)
  // at this point go in and clean up some of the extra [['s and \"]s in link:action's
  removeBracketsFromLinks(passage)
  handleImage(passage)
  handleVideo(passage)
  handleEmbeddedLink(passage)
  handleHTML(passage)
  handlePhone(passage)
  return passage
})



require('fs').writeFileSync('test.json', JSON.stringify(result, null, 2))




function shouldSkip(text) {
  if (!text.trim()) return true
  if (text.trim() === '</div>') return true
  if (text.trim() === '"]') return true
}

function handleMeta(text) {
  text = text.split('"').map(t => t.trim())
  const meta = {
    id: text[3],
    name: text[7]
  }
  return meta

}

function handleActionLinks(passage) {
  passage.content.forEach((c, i) => {
    let content = c.content
    content = content.trim()
    if (i >= passage.content.length - 3 && content[0] === '[' && content[1] === '[') {
      c.JSXType = 'link:action'
    }
    return c
  })
}


function handleAliasLinks(passage) {
  passage.content.forEach(c => {
    if (c.JSXType !== 'link' && c.JSXType !== 'link:action') return
    if (c.content.includes('->')) {
      let [alias, link] = c.content.trim().split('->')
      alias = alias.substring(2)
      link = link.substring(0, link.indexOf(']]'))


      c.content = alias
      c.linksTo = link
    }
    else if (c.content.includes('-&gt;')) {
      let [alias, link] = c.content.trim().split('-&gt;')
      alias = alias.substring(2)
      link = link.substring(0, link.indexOf(']]'))


      c.content = alias
      c.linksTo = link
    }
    else {
      const openBrackIdx = c.content.indexOf('[[') + 2
      const closeBrackIdx = c.content.indexOf(']]')
      c.linksTo = c.content.substring(openBrackIdx, closeBrackIdx)
    }

  })
}

function removeBracketsFromLinks(passage) {
  passage.content.forEach(c => {
    if (c.content.includes('\"]')) c.content = c.content.substring(0, c.content.indexOf('\"]'))
    if (c.JSXType !== 'link:action' && c.JSXType !== 'link') return
    if (c.content[0] === '[' && c.content[c.content.length - 1] === ']') {
      const openBrackIdx = c.content.indexOf('[[') + 2
      const closeBrackIdx = c.content.indexOf(']]')
      c.content = c.content.substring(openBrackIdx, closeBrackIdx)
    }
  })
}

function handleImage(passage) {
  passage.content.forEach(c => {
    if (!c.content.includes('<img')) return
    c.content = c.content.substring(c.content.indexOf('src=\"') + 5)
    c.content = c.content.substring(0, c.content.indexOf('"'))
    if (c.content.includes('/')) {
      const arrayified = c.content.split('/')
      c.content = arrayified[arrayified.length - 1]
    }
    c.JSXType = 'image'
  })
}

function handleVideo(passage) {
  passage.content.forEach(c => {
    if (!c.content.includes('<video')) return
    c.JSXType = 'video'
    let src = c.content.split('src="')[1].split('"')[0].split('/')
    src = src[src.length - 1]
    c.content = src
  })
}

function handleEmbeddedLink(passage) {
  passage.content.forEach(c => {
    if (c.JSXType !== 'text' && c.JSXType !== 'text:paragraphStart') return
    if (c.content.includes('[[')) {

      if (c.content.split('[[').length !== 2) handleMultipleLinks(passage)
      else {
        const [start, end] = c.content.split('[[')
        const [link, rest] = end.split(']]')
        const startContent = {
          JSXType: c.JSXType,
          linksTo: null,
          content: start
        }
        const linkContent = {
          JSXType: 'link',
          linksTo: link,
          content: link
        }
        if (link.includes('->')) {
          const [alias, actual] = link.split('->')
          linkContent.linksTo = actual
          linkContent.content = alias
        }
        if (link.includes('-&gt;')) {
          const [alias, actual] = link.split('-&gt;')
          linkContent.linksTo = actual
          linkContent.content = alias
        }
        const endContent = {
          JSXType: 'text',
          linksTo: null,
          content: rest
        }
        c.JSXType = 'link:embedded'
        c.content = [startContent, linkContent, endContent]
      }
    }
  })
}

function handleMultipleLinks(passage) {
  console.log(`did not account for ${passage.content}`)
}

function handleHTML(passage) {
  passage.content = passage.content.reduce((acc, jsxBit) => {
    if (jsxBit.content.includes('\"send') ||
      jsxBit.content.includes('<p>Message') ||
      jsxBit.content.includes('msg-bar') ||
      jsxBit.content.includes('msg-write') ||
      jsxBit.content.includes('\"messages') ||
      jsxBit.content.includes('\"utility') ||
      jsxBit.content.includes('\"screen') ||
      jsxBit.content.includes('class=\"cell') ||
      jsxBit.content.includes('\"circle\"')
    ) {
      // console.log('deleting: ', jsxBit)
      return acc
    }
    else return [...acc, jsxBit]
  }, [])
}

function handlePhone(passage) {
  /**
   * JSXType: 'phone
   * linksTo: null
   * content: 
   *    name: string
   *    messages: 
   *      text: string
   *      isReceived: bool
   */

  if (!passage.content[0].content.includes('phone-back')) return

  passage.JSXType = 'phone'

  const phone = {
    JSXType: 'phone',
    content: {
      name: '',
      messages: []
    }
  }

  const content = passage.content.reduce((acc, p) => {
    if(p.content.includes('wacc-mini-logo')) return acc
    if (p.JSXType === 'text:paragraphStart' && !p.content.includes('msg') && !p.content.includes('phone-back')) {
      return [...acc, p]
    }
    if (p.content.includes('\"phone-back\"')) {
      const name = p.content.split('</span>')[1].split('<span')[0].trim()
      acc[0].content.name = name
      return acc
    } else {
      const message = {
        isImage: p.JSXType === 'image',
        isReceived:!p.content.includes('msg-send'),
      }

      message.content = message.isImage ? p.content : p.content.split('>')[1].split('<')[0]
      acc[0].content.messages = [...acc[0].content.messages, message]
      return acc

    }

  }, [phone])

  console.log(content)
  passage.content = content
}