const storyConverter = (story, outputname) => {
  const passages = story.split('</tw-passagedata>')
  
  const splitPassage = p => {
    const closingBracket = p.indexOf('>') + 1
    const body = p.substr(closingBracket)
    const openTag = p.substr(0, closingBracket)
    return {openTag, body}
  }
  
  const getMetaData = openTag => {
    if(!openTag) return {pid: null, name: null}
    console.log(openTag.split('pid="'))
    console.log(openTag)
    const pid = openTag.split('pid="')[1].split('"')[0]
    const name = openTag.split('name="')[1].split('"')[0]
    return {pid, name}
  }
  
  const splitText = body => {
    const elements = body.split('\n').filter(e => !!e)
    const formatted = elements.map(e => {
      if(e.trim().startsWith('<img')) return handleImg(e)
      if(e.trim().startsWith('[[')) return handleLink(e, true)
      if(e.trim().includes('[[')) return handleMixedContent(e)
      return handleText(e)
    })
    return formatted
  }
  
  const handleImg = img => {
    const src = img.split('src="')[1].split('"')[0]
    const jsonElement = {
      JSXType: 'image',
      content: src,
      linksTo: null
    }
    return jsonElement
  }
  
  const handleText = txt => {
    return {
      JSXType: 'text',
      content: txt,
      linksTo: null
    }
  }
  
  const handleLink = (link, isAction = false) => {
    if(link.includes('img')) return handleImageLink(link)
    if (link.indexOf('->') > 0) return handleLinkWithAlias(link, isAction)
    return handleLinkWithNoAlias(link)
  }
  
  const handleLinkWithAlias = (link, isAction) => {
    link = link.split('[[')[1].split(']]')[0]
    const [alias, linkDest] = link.split('->')
    return {
      JSXType: isAction ? 'link:action' : 'link',
      content: alias.trim(),
      linksTo: linkDest.trim()
    }
  }
  
  const handleLinkWithNoAlias = (link, isAction) => {
    link = link.split('[[')[1].split(']]')[0]
    return {
      JSXType: isAction ? 'link:action' : 'link',
      content: link.trim(),
      linksTo: link.trim()
    }
  }
  
  const handleImageLink = link => {
    link = link.split('[[')[1].split(']]')[0]
    const [alias, linkDest] = link.split('->')
    const {content} = handleImg(alias)
    return {
      jsxType: 'image',
      content,
      linksTo: linkDest
    }
  }
  
  const handleMixedContent = e => {
    // Hello here is [[a link]] and one [[more]]
    const splitContent = e.split('[[') // [ hello here is , a link]] and one , more]] ]
  
    const mappedContent = splitContent.reduce((acc, c) => {
      if(c.includes(']]')) {
        const [link, text] = c.split(']]')
        const jsonLink = handleLink(`[[${link}]]`)
        const jsonText = text && handleText(text)
        return jsonText
          ? [...acc, jsonLink, jsonText]
          : [...acc, jsonLink]
      }
      else return [...acc, handleText(c)]
    }, [])
  
    return mappedContent
  }
  
  const formattedPassages = passages.map(p => {
    const {openTag, body} = splitPassage(p)
    const meta = getMetaData(openTag)
    const JSXElementList = splitText(body)
  
    return Object.assign({}, meta, {content: JSXElementList})
  })
  
  
  require('fs').writeFileSync(`./${outputname}.json`, JSON.stringify(formattedPassages, null, 2))
}
