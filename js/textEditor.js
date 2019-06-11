const controllersMain = [
  {cmd: "undo", args: null, icon: 'undo', type: 'btn', group: 'memory'},
  {cmd: "redo", args: null, icon: 'redo', type: 'btn', group: 'memory'},
  {cmd: "fontName", icon: null, type: 'dropdown', group: null, args: [
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['"Arial Black", Gadget, sans-serif', 'Arial Black'],
    ['Verdana, Geneva, sans-serif', 'Verdana'], 
    ['"Courier New", Courier, monospace', 'Courier'],
    ['"Times New Roman", Times, serif', 'Times']]
  },
  {cmd: "fontSize", icon: 'format_size', type: 'dropdown', group: null, args: [
    [2, "Small", 'small'], [3, "Medium", 'medium'], [4, "Large", 'large'], [5, "Huge", 'x-large']
  ]},
  {cmd: "bold", icon: 'format_bold', args: null, type: 'btn', group: 'stylize'},
  {cmd: "italic", icon: 'format_italic', args: null, type: 'btn', group: 'stylize'},
  {cmd: "underline", icon: 'format_underline', args: null, type: 'btn', group: 'stylize'},
  {cmd: "foreColor", icon:'format_color_text', type: 'dropdown', group: null, args: [
    ['black', "Black"], ['grey', 'Grey'], ['red', "Red"], ['blue', "Blue"], ['green', "Green"], ['white', "White"]
  ]},
  {cmd: "backColor", icon:'format_color_fill', type: 'dropdown', group: null, args: [
    ['black', "Black"], ['grey', 'Grey'], ['red', "Red"], ['blue', "Blue"], ['green', "Green"], ['white', "White"]
  ]},
  {cmd: "justifyLeft", icon: 'format_align_left',args: null, type: 'dropdown', group: 'align'},
  {cmd: "justifyRight", icon: 'format_align_right',args: null, type: 'dropdown', group: 'align'},
  {cmd: "justifyCenter", icon: 'format_align_center',args: null, type: 'dropdown', group: 'align'},
  {cmd: "justifyFull", icon: 'format_align_justify', args: null, type: 'dropdown', group: 'align'},
  {cmd: "insertUnorderedList", icon: 'format_list_bulleted', args: null, type: 'btn', group: 'list'},
  {cmd: "insertOrderedList", icon: 'format_list_numbered', args: null, type: 'btn', group: 'list'},
  {cmd: "indent", icon: 'format_indent_increase', args: null, type: 'btn', group: 'misc'},
  {cmd: "outdent", icon: 'format_indent_decrease', args: null, type: 'btn', group: 'misc'},
  {cmd: "removeFormat", icon: 'format_clear', args: null, type: 'btn', group: 'misc'},
]

const controllersTitle = [
  {cmd: "undo", args: null, icon: 'undo', type: 'btn', group: 'memory'},
  {cmd: "redo", args: null, icon: 'redo', type: 'btn', group: 'memory'},
  {cmd: "fontName", icon: null, type: 'dropdown', group: null, args: [
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['"Arial Black", Gadget, sans-serif', 'Arial Black'],
    ['Verdana, Geneva, sans-serif', 'Verdana'], 
    ['"Courier New", Courier, monospace', 'Courier'],
    ['"Times New Roman", Times, serif', 'Times']]
  },
  {cmd: "bold", icon: 'format_bold', args: null, type: 'btn', group: 'stylize'},
  {cmd: "italic", icon: 'format_italic', args: null, type: 'btn', group: 'stylize'},
  {cmd: "underline", icon: 'format_underline', args: null, type: 'btn', group: 'stylize'},
  {cmd: "foreColor", icon:'format_color_text', type: 'dropdown', group: null, args: [
    ['black', "Black"], ['grey', 'Grey'], ['red', "Red"], ['blue', "Blue"], ['green', "Green"], ['white', "White"]
  ]},
  {cmd: "backColor", icon:'format_color_fill', type: 'dropdown', group: null, args: [
    ['black', "Black"], ['grey', 'Grey'], ['red', "Red"], ['blue', "Blue"], ['green', "Green"], ['white', "White"]
  ]},
  {cmd: "removeFormat", icon: 'format_clear', args: null, type: 'btn', group: 'misc'},
]


class TextEditor {
  constructor( textAreaElement, controllers ){
    this.textArea = textAreaElement
    this.controllers = controllers
    this.controllerGroups = []
    this.toolbar = document.createElement('DIV')
    this.container = document.createElement('DIV')

    this.initialize()

    // Event listeners
    document.addEventListener('mouseup', this.handleDocMouseup.bind(this) )
    this.toolbar.addEventListener('mousedown', this.handleToolbarMousedown.bind(this) )
    this.dropTriggers.forEach( trigger => {
      trigger.addEventListener('mousedown', this.toggleDropdown )
    })
    this.toolBtns.forEach( btn => {
      btn.addEventListener('mousedown', this.handleBtnClick )
    })
    this.dropItems.forEach( item => {
      item.addEventListener('mousedown', this.handleDropItemClick )
    })
    this.textArea.addEventListener('keydown', this.handleTextAreaKeydown )
    console.log(this.textArea)
    this.textArea.addEventListener('mouseup', this.updateToolbarSelected.bind(this) )

    // Create / Setup UI
    this.updateToolbarSelected()
    this.toolbar.classList.add('toolbar')

    this.insertEditor()

  }
  
  seperateGroups(){
    // Group controllers to be parsed for display
    this.controllers.forEach( (controller, i) => {
      if( i == 0 || !controller.group || controller.group !== this.controllers[i - 1].group ){
        let name = controller.group ? controller.group : 'single'
        this.controllerGroups.push({name: name, items: [controller]})
      }
      else if( controller.group && controller.group === this.controllers[i-1].group){
        let ind = this.controllerGroups.findIndex( item => item.name === controller.group )
        this.controllerGroups[ind].items.push(controller)
      }
    })
  }

  buildGroups(){
    this.controllerGroups.forEach( group => {
      let gDiv = document.createElement('DIV')
      gDiv.classList.add('btn-group')
      if(group.name !== 'single' && group.items[0].type === 'dropdown'){ // Dropdown with multiple buttons
        gDiv.appendChild(this.buildDropdown(group))
        group.items.forEach( item => {
          gDiv.querySelector('.drop-menu').appendChild(this.buildDropdownItem(item, item.cmd))
        })
        this.toolbar.appendChild(gDiv)
        this.toolbar.innerHTML += '<div class="toolbar-break"></div>'
      }
      else if(group.name === 'single' && group.items[0].type === 'dropdown'){ // Dropdown with non-button list
        gDiv.appendChild(this.buildDropdown(group))
        group.items[0].args.forEach( arg => {
          gDiv.querySelector('.drop-menu').appendChild(this.buildDropdownItem(arg, group.items[0].cmd ))
        })
        this.toolbar.appendChild(gDiv)
        this.toolbar.innerHTML += '<div class="toolbar-break"></div>'
      }
      else if(group.name !== 'single' && group.items[0].type !== 'dropdown'){ // Non-dropdown, multiple buttons
        group.items.forEach( item => {
          gDiv.appendChild(this.buildBtn(item))
        })
        this.toolbar.appendChild(gDiv)
        this.toolbar.innerHTML += '<div class="toolbar-break"></div>'
      }
      else { // Non dropdown, single button. ??? Other cases ??? 
        
      }
    })
  }

  buildBtn(item){
    const div = document.createElement('DIV')
    div.classList.add('toolbar-btn')
    div.dataset.command = item.cmd
    div.innerHTML = `<i class="material-icons">${item.icon}</i>`
    return div
  }

  buildDropdownItem(item, cmd){
    const li = document.createElement('LI')
    let arg
    li.classList.add('drop-item')
    if( cmd === 'fontName'){
      li.style.fontFamily = item[0]
      arg = item[0]
    } else if ( cmd === 'fontSize' ){
      li.style.fontSize = item[2]
      arg = item[0]
    } else if ( cmd === 'foreColor'){
      li.style.color = item[0]
      arg = item[0]
    } else if ( cmd === 'backColor'){
      li.style.border = "2px solid " + item[0]
      arg = item[0]       
    } else { arg = null}
    let html = Array.isArray(item) ? item[1] : "<i class='material-icons'>" + item.icon + "</i>"
    li.innerHTML = html
    li.dataset.command = cmd
    li.dataset.argument = arg
    return li
  }

  buildDropdown(group){
    const container = document.createElement('DIV')
    let startVal = group.items[0].icon ? group.items[0].icon : group.items[0].args[0][1] // Use icon if has one
    let type = group.items[0].icon ? 'btn' : 'text'
    container.classList.add('drop-container')
    if(group.items[0].cmd === 'fontName'){
      container.classList.add('fontName-container')
    }
    container.innerHTML = `
    <div class='drop-trigger' data-command='${group.items[0].cmd}'>
      <span>${ type === 'text' ? startVal : '<i class="material-icons">' + startVal + '</i>'}</span>
      <i class='material-icons'>arrow_drop_down</i>
    </div>
    <ul class='drop-menu'>
    </ul>`
    return container
  }

  initialize(){
    this.seperateGroups()
    this.buildGroups()
    this.toolBtns = this.toolbar.querySelectorAll('.toolbar-btn')
    this.dropTriggers = this.toolbar.querySelectorAll('.drop-trigger')
    this.dropItems = this.toolbar.querySelectorAll('.drop-item')
  }

  // Event handlers

  handleDocMouseup(e){
    const activeDropMenu = this.toolbar.querySelector('.drop-menu.active')
    if( activeDropMenu ){
      e.preventDefault()
      const drop = e.target.closest('.drop-container')
      const dropItem = e.target.closest('.drop-item')
      if( !drop ){ // If there is an active menu but clicked outside, hide
        this.toggleDropdown()
      }
      else if ( dropItem ){ // If clicked a dropdown menu item
        this.toggleDropdown()
      }
    }
  }

  handleToolbarMousedown(e){
    e.preventDefault()
    this.textArea.focus()
    this.updateToolbarSelected(e)
  }

  handleBtnClick(e){
    e.preventDefault()
    const btn = e.target.closest('.toolbar-btn')
    document.execCommand(btn.dataset.command, false, null)
  }

  handleDropItemClick(e){
    const item = e.target.closest('.drop-item')
    document.execCommand(item.dataset.command, false, item.dataset.argument)
  }

  // Utility UI functions

  toggleDropdown(e = null){
    if( e ){
      const menu = e.target.closest('.drop-container').querySelector('.drop-menu')
      if( menu.style.display === 'block'){
        menu.style.display = 'none'
        menu.classList.remove('active')
      } else {
        menu.style.display = 'block'
        menu.classList.add('active')
      }
    }
    else {
      const menu = document.querySelector('.drop-menu.active')
      if ( menu ){
        menu.style.display = 'none'
        menu.classList.remove('active')
      }
    }
  }

  updateToolbarSelected(){ // Updates toolbar to display currently selected settings where applicable
    // Update current styling buttons
    const selectableCmds = ["bold", "underline", "italic", "insertUnorderedList", "insertOrderedList"]
    const toolbar = this.toolbar
    selectableCmds.forEach( cmd => {
      const el = toolbar.querySelector("[data-command='" + cmd + "']")
      if( !el ){ return }
      else if (document.queryCommandState(cmd)){ // add active class if queryCommandState returns true
        el.classList.add('active')
      } 
      else {
        el.classList.remove('active')
      }
    })
    
    // Update Font Dropdown
    const fontController = this.controllers.find( item => item.cmd === 'fontName')
    const currentFont = document.queryCommandValue('FontName')
    const currentFontArray = fontController.args.find( arg => arg[0] === currentFont)
    const currentFontShortName = currentFontArray ? currentFontArray[1] : 'Default'
    // Update font label to what is currently selected in textArea
    const fontLabel = this.toolbar.querySelector('[data-command="fontName"] > span')
    fontLabel.textContent = currentFontShortName
    fontLabel.style.fontFamily = currentFont
    
    // Update Justification Dropdown
    if( this.controllers.find(item => item.group === 'align') ){
      const justifyArr = ['justifyLeft', 'justifyRight', 'justifyCenter', 'justifyFull']
      const justifyLabel = this.toolbar.querySelector('[data-command="justifyLeft"] > span > i')
      justifyArr.forEach( cmd => {
        if( document.queryCommandState(cmd) ){
          justifyLabel.textContent = this.controllers.find( item => item.cmd === cmd ).icon
          return
        }
      })
    }
    
  }

  handleTextAreaKeydown(e){ // Allows using Tab in text area
    e = e || window.event // for older IE versions
    if( e.keyCode === 9){
      e.preventDefault()
      document.execCommand('insertText', false, "  ")
    }
  }

  insertEditor(){
    const wrapper = document.createElement('DIV')
    wrapper.classList.add('editor-wrapper')
    // insert wrapper before textArea
    this.textArea.insertAdjacentElement('beforebegin', wrapper)
    // move textArea inside wrapper
    wrapper.appendChild(this.textArea)
    // insert toolbar inside wrapper
    this.textArea.insertAdjacentElement('beforebegin', this.toolbar)

  }

}






