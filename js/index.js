const ui = (function(){ // IIFE: immediately invoked function expression

  // From Firebase Firestore
  let todoData, noteData

  const accountModal = document.querySelector('#modal-account')
  const noteModal = document.querySelector('#modal-note')
  const loggedInItems = document.querySelectorAll('.logged-in')
  const loggedOutItems = document.querySelectorAll('.logged-out')
  const todosCollection = document.getElementById('todos-collection')
  const notesCollection = document.getElementById('notes-collection')
  const editWidget = document.getElementById('edit-item-widget')

  // User data document reference from firestore
  let userDocRef = null

  let listening = false // Whether document click listener is active
  let status = null // Status of UI. Editing, Creating, etc.

  let originalTodoData = {} // Variable to store data copy for compare

  let originalNoteData = {} // Variable to store data copy for compare

  /****************** 
   * Main UI Setup. Hide things for logged out users, show for logged in users.
  ******************/

  function setupUI(user){
    if( user ){ // There is a logged in user

      userLoggedIn()
      populateAccountModal(user)
      document.addEventListener('click', docClickListen )
      listening = true
      userDocRef = db.collection('users').doc(user.uid)
    }
    else { // No logged in user
      userLoggedOut()
    }
  }

  function buildTodos(data){
    todoData = data
    let dataArr = Object.values(todoData).sort( (a,b) => a.order - b.order )
    todosCollection.innerHTML = ''
    let html = ''
    dataArr.forEach( item => {
      html += `
        <li class="collection-item" data-id=${item.id} data-order=${item.order}>
          <i class='material-icons drag'>drag_handle</i>
          <span class='text'>${item.title}</span>
        </li>`
    })
    todosCollection.innerHTML = html
    console.log('todos list re-built')
  }

  function buildNotes(data){
    noteData = data
    let dataArr = Object.values(noteData).sort( (a,b) => a.order - b.order )
    notesCollection.innerHTML = ''
    let html = ''
    dataArr.forEach( item => {
      let cleanedText = item.formattedContent.replace(/<div>/g, ' ')
      cleanedText = cleanedText.replace(/<[^>]+>/g, '')
      html += `
        <li class="collection-item" data-id=${item.id} data-order=${item.order}>
          <i class='material-icons drag'>drag_handle</i>
          <span class='note-contain'>
            <span class='text'>${item.formattedTitle}</span>
            <span class='content'>${cleanedText}</span>
          </span>
        </li>`
    })
    notesCollection.innerHTML = html
    console.log('notes list re-built')
  }

  function userLoggedOut(){
    if( listening ){
      document.removeEventListener('click', docClickListen )
      listening = false
    }
    loggedInItems.forEach( item => item.style.display = 'none')
    loggedOutItems.forEach( item => item.style.display = 'block')
    clearUserInfo()
  }

  function userLoggedIn(){
    document.addEventListener('click', docClickListen )
    loggedInItems.forEach( item => item.style.display = 'block')
    loggedOutItems.forEach( item => item.style.display = 'none')
  }

  function clearUserInfo(){
    todosCollection.innerHTML = ''
    notesCollection.innerHTML = ''
    userDocRef = null
    // clear account modal info
    accountModal.querySelector('.info').innerHTML = ''
  }

  function populateAccountModal(user){
    let info = accountModal.querySelector('.info')
    let html = ``
    let fields = [['displayName', 'Display Name'], ['email', 'Email'], ['verified', 'Verified'], 
      ['photoURL', 'Photo'], ['phoneNumber', 'Phone Number'], ['metadata.creationTime', 'Created'],
      ['metadata.lastSignInTime', 'Last Sign In']]
    fields.forEach( field => {
      if( user[field[0]] ){
        html += `<div><span style='font-weight: bold;'>${field[1]}: </span>${user[field[0]]}</div>`
      }
    })
    info.innerHTML = html;
  }

  function showEditWidget(target){
    const deleteBtn = document.querySelector('#edit-item-widget .delete')
    if( status === 'editingTodo'){ // Hide delete button when creating, show when editing
      deleteBtn.style.display = 'block'
    } else {
      deleteBtn.style.display = 'none'
    }
    const rect = target.getBoundingClientRect()
    target.querySelector('.text').contentEditable = true
    target.querySelector('.text').focus()
    editWidget.dataset.currentTodo = target.dataset.id
    editWidget.style.left = rect.x + 5  + 'px';
    editWidget.style.top = (rect.y + rect.height + 5) + 'px';
    editWidget.style.width = document.querySelector('#todos-collection').getBoundingClientRect().width - 10 + 'px'
    editWidget.style.display = 'block'
  }

  function hideEditWidget(){
    const els = document.querySelectorAll('#todos-collection .collection-item')
    els.forEach( el => {
      el.classList.remove('editable')
      el.querySelector('.text').contentEditable = 'false'
    })
    editWidget.style.display = 'none'
    editWidget.dataset.currentTodo = ''
    status = null
  }

  function toggleTodoDragHandles(){
    let handles = document.querySelectorAll('#todos-collection .collection-item .drag')
    if( handles[0].style.display === 'none'){
      // Show handles
      handles.forEach( handle => { handle.style.display = 'block'})
    } else {
      // Hide handles
      handles.forEach( handle => { handle.style.display = 'none'})
    }
  }

  /****************** 
   * non-DB list functions
  ******************/

  function validateItem(id, type){
    
  }

  function createNewTodo(){
    console.log('create todo')
    let li = document.createElement('LI')
    li.innerHTML = `<i class='material-icons drag'>drag_handle</i><span class='text'></span>`
    li.classList.add('collection-item')
    li.classList.add('editable')
    li.dataset.id = getUniqueID()
    todosCollection.appendChild(li)
    status = 'creatingTodo'
    addListenerToEditableTodo()
    toggleTodoDragHandles()
  }

  function cancelNewTodo(){
    console.log('cancel newTodo')
    todosCollection.removeChild(todosCollection.lastChild)
    status = null
    toggleTodoDragHandles()
  }

  function editTodo(target){
    console.log('edit todo: ' + target.dataset.id)
    target.classList.add('editable')
    status = 'editingTodo'
    addListenerToEditableTodo()
    toggleTodoDragHandles()
  }

  function cancelTodoEdit(){
    console.log('cancel editTodo')
    const el = document.querySelector('#todos-collection .editable')
    const id = el.dataset.id
    const todo = todoData[id]
    cancelListenerOnEditableTodo()
    el.querySelector('.text').textContent = todo.title
    el.classList.remove('editable')
    status = null
    hideEditWidget()
    toggleTodoDragHandles()
  }

  function viewNote(target){
    console.log('view note')
    let id = target.dataset.id
    const title = noteModal.querySelector('.modal-content .title')
    const content = noteModal.querySelector('.modal-content .content')
    title.innerHTML = noteData[id].formattedTitle
    content.innerHTML = noteData[id].formattedContent
    noteModal.dataset.id = id
    status = 'viewingNote'
  }

  function editNote(){
    console.log('edit note')
    makeNoteEditable()
    // change class styling
    // change button
    status = 'editingNote'
  }

  function closeNote(){
    const title = noteModal.querySelector('.modal-content .title')
    const content = noteModal.querySelector('.modal-content .content')
    const editSaveBtn = document.querySelector('#modal-note .edit-save-btn')
    if( editSaveBtn.classList.contains('save')){
      toggleSaveEditBtn()
      removeNoteEditable()
    }
    if( noteModal.classList.contains('new-note') ){
      noteModal.classList.remove('new-note')
    }
    title.innerHTML = ''
    content.innerHTML = ''
    title.contentEditable = 'false';
    content.contentEditable = 'false';
    noteModal.dataset.id = ''
    status = null
    M.Modal.getInstance(noteModal).close()
  }

  function createNewNote(){
    makeNoteEditable()
    toggleSaveEditBtn()
    noteModal.dataset.id = getUniqueID()
    noteModal.classList.add('new-note')
    status = 'editingNote'
    M.Modal.getInstance(noteModal).open()
  }

  function toggleSaveEditBtn(){
    const btn = document.querySelector('#modal-note .edit-save-btn')
    if( btn.classList.contains('edit') ){
      btn.classList.remove('edit')
      btn.classList.add('save')
      btn.textContent = 'Save'
    } else {
      btn.classList.remove('save')
      btn.classList.add('edit')
      btn.textContent = 'Edit'
    }
  }

  function makeNoteEditable(){
    const box = document.querySelector('#modal-note .modal-content')
    const title = document.querySelector('#modal-note .title')
    const content = document.querySelector('#modal-note .content')
    box.classList.add('editable')
    title.contentEditable = 'true'
    content.contentEditable = 'true'
  }

  function removeNoteEditable(){
    const box = document.querySelector('#modal-note .modal-content')
    const title = document.querySelector('#modal-note .title')
    const content = document.querySelector('#modal-note .content')
    box.classList.remove('editable')
    title.contentEditable = 'false'
    content.contentEditable = 'false'
    const toolbars = document.querySelectorAll('.editor-wrapper .toolbar')
    toolbars.forEach( tb => tb.style.display = 'none')
  }

  /****************** 
   * DB interfacing list functions
  ******************/

  function saveNewTodo(){
    console.log('save new todo')
    const el = document.querySelector('#todos-collection .editable')
    const text = el.querySelector('.text').textContent
    const reference = "todos." + el.dataset.id
    userDocRef.update({
      [reference] : {
        title: text,
        id: el.dataset.id,
        order: Object.keys(todoData).length + 1,
        timestamp: firebase.firestore.Timestamp.now(),
        lastEdited: firebase.firestore.Timestamp.now()
      }
    }).then( ()  => {
        console.log("Added Item" )
        M.toast({
          html: "New Todo Created",
        })
    }).catch( err => {
        console.log( err )
        M.toast({html: "Error Saving Todo"})
    })
    status = null
    toggleTodoDragHandles()
  }

  function saveTodoEdit(){
    console.log('save edit todo')
    const el = document.querySelector('#todos-collection .editable')
    const id = el.dataset.id
    const text = el.querySelector('.text').textContent

    // If edit didn't change anything, don't send update request
    /* Validate text e.g. trim etc. */
    if( text === todoData[id].title){
      console.log('edit item is the same, not saved')
      return
    } 
    const reference = "todos." + id + ".title"
    const reference2 = "todos." + id + ".lastEdited"
    userDocRef.update({
      [reference]: text,
      [reference2]: firebase.firestore.Timestamp.now()
    }).then( ()  => {
        console.log("Edited Item Success")
        M.toast({
          html: "Edit Saved",
        })
    }).catch( () => {
        console.log( "Error adding item" )
        M.toast({
          html: "Error Saving Edit",
        })
    })
    toggleTodoDragHandles()
  }

  function deleteTodo(id){
    console.log('delete todo')
    delete todoData[id]
    // re-order remaining items
    const items = document.querySelectorAll('#todos-collection .collection-item')
    let arr = Array.from(items).filter( item => item.dataset.id !== id)
    arr.forEach( (item, i) => {
      todoData[item.dataset.id].order = i + 1
    })
    userDocRef.update({
      todos: todoData
    }).then( ()  => {
        console.log("Deleted Todo" )
        M.toast({html: "Deleted Todo"})
    }).catch( err => {
        console.log( err )
        M.toast({html: "Errore Deleting Todo"})
    })
    status = null
  }

  function saveAllTodosFromLocal(data = null){
    // If passing data to function, save that, otherwise save todosData
    if(data){
      userDocRef.update({
        todos: data
      })
    }
    else {
      // save local copy of todos to document
      userDocRef.update({
        todos: todoData
      })
    }
  }

  function saveAllNotesFromLocal(data = null){
     // If passing data to function, save that, otherwise save todosData
    if(data){
      userDocRef.update({
        notes: data
      })
    }
    else {
      // save local copy of todos to document
      userDocRef.update({
        notes: notesData
      })
    }
  }

  function saveNewNote(){
    console.log('save new todo')
    const title = noteModal.querySelector('.modal-content .title')
    const content = noteModal.querySelector('.modal-content .content')
    const reference = "notes." + noteModal.dataset.id
    userDocRef.update({
      [reference] : {
        formattedTitle: title.innerHTML,
        rawTitle: title.textContent, 
        formattedContent: content.innerHTML,
        rawContent: content.textContent,
        id: noteModal.dataset.id,
        order: Object.keys(noteData).length + 1,
        timestamp: firebase.firestore.Timestamp.now(),
        lastEdited: firebase.firestore.Timestamp.now()
      }
    }).then( ()  => {
        console.log("Added Note" )
        M.toast({
          html: "New Note Created",
        })
    }).catch( err => {
        console.log( err )
        M.toast({
          html: "Error Creating Note",
        })
    })
    status = null
  }

  function saveNoteEdit(){
    console.log('save note edit')
    const id = noteModal.dataset.id
    const title = noteModal.querySelector('.modal-content .title')
    const content = noteModal.querySelector('.modal-content .content')

    // If edit didn't change anything, don't send update request
    /* Validate text e.g. trim etc. */
    if( title.textContent === noteData[id].rawTitle &&
       content.textContent === noteData[id].rawContent &&
       title.innerHTML === noteData[id].formattedTitle &&
       content.innerHTML === noteData[id].formattedContent){
      console.log('edit item is the same, not saved')
      return
    } 
    const rTitleRef = "notes." + id + ".rawTitle"
    const fTitleRef = "notes." + id + ".formattedTitle"
    const rContentRef = "notes." + id + ".rawContent"
    const fContentRef = "notes." + id + ".formattedContent"
    const editedRef = "notes." + id + ".lastEdited"
    userDocRef.update({
      [rTitleRef]: title.textContent,
      [fTitleRef]: title.innerHTML,
      [rContentRef]: content.textContent,
      [fContentRef]: content.innerHTML,
      [editedRef]: firebase.firestore.Timestamp.now()
    }).then( ()  => {
        console.log("Edited Note Success")
        M.toast({
          html: "Note Edit Saved",
        })
    }).catch( () => console.log( "Error adding item" ))
  }

  function deleteNote(id){
    console.log('delete note')
    delete noteData[id]
    // re-order remaining items
    const items = document.querySelectorAll('#notes-collection .collection-item')
    let arr = Array.from(items).filter( item => item.dataset.id !== id)
    arr.forEach( (item, i) => {
      noteData[item.dataset.id].order = i + 1
    })
    userDocRef.update({
      notes: noteData
    }).then( ()  => {
        console.log("Deleted Note" )
        M.toast({html: "Deleted Note"})
    }).catch( err => {
        console.log( err )
        M.toast({html: "Error Deleting Note"})
    })
    status = null
  }

  /****************** 
   * Event Listeners
  ******************/
  
  function addListenerToEditableTodo(){
    const el = document.querySelector('#todos-collection .editable')
    el.addEventListener('keydown', handleTodoKeyInput )
    el.addEventListener('paste', pasteAsPlainText)
  }

  function cancelListenerOnEditableTodo(){
    const el = document.querySelector('#todos-collection .editable')
    el.removeEventListener('keydown', handleTodoKeyInput )
    el.removeEventListener('paste', pasteAsPlainText)
  }

  function handleTodoKeyInput(e){
    if(e.key === 'Enter'){
      e.preventDefault()
      if( status === 'editingTodo'){
        saveTodoEdit()
      }
      else if ( status === 'creatingTodo'){
        saveNewTodo()
      }
      hideEditWidget()
    }
    else if ( e.key === 'Escape' ){
      e.preventDefault()
      if( status === 'editingTodo'){
        cancelTodoEdit()
      }
      else if( status === 'creatingTodo'){
        cancelNewTodo()
      }
    }

  }

  function pasteAsPlainText(e){
    e.preventDefault()
    let text = e.clipboardData.getData("text/plain")
    text = text.replace(/\n/g, ' ')
    document.execCommand('insertText', false, text)
    console.log(text)
  }

  /****************** 
   * Listen and handle clicks on entire doc when user logged in
  ******************/

  function docClickListen(e){
    // check which item was clicked
    const activeNoteModal = e.target.closest('#modal-note')

    const todoItem = e.target.closest('#todos-collection .collection-item')
    const cancelBtn = e.target.closest('#edit-item-widget .cancel')
    const saveBtn  = e.target.closest('#edit-item-widget .save')
    const deleteBtn  = e.target.closest('#edit-item-widget .delete')
    const addTodoBtn = e.target.closest('#add-todo')

    const addNoteBtn = e.target.closest('#add-note')
    const saveNoteBtn = e.target.closest('#modal-note .save')
    const editNoteBtn = e.target.closest('#modal-note .edit')
    const cancelNoteBtn = e.target.closest('#modal-note .cancel')
    const deleteNoteBtn = e.target.closest('#modal-note .delete')
    const noteItem = e.target.closest('#notes-collection .collection-item')

    const moveHandle = e.target.closest('.collection .collection-item .drag')

    // Don't do anything if clicking a handle. Must specify because it's inside other element
    if( moveHandle ) { return } 

    if( status !== null){ // If there is a status other than null
      if( status === 'creatingTodo'){
        if( todoItem ){ // Clicked on a todo item
          if ( todoItem !== document.querySelector('.editable')){ // Clicked on non-current todo item
            // Switch to edit other item, cancel this one
            cancelNewTodo()
            hideEditWidget()
            editTodo(todoItem)
            showEditWidget(todoItem)
          }
          else { // Clicked on current todo item
            // Do nothing
          }
        }
        else if ( saveBtn ){ // Clicked save button
          console.log('save new')
          // save item
          saveNewTodo()
          hideEditWidget()
        }
        else if ( addTodoBtn ){
          // Don't save or cancel
          // Refocus on element so user knows they must interact before adding another item
          setTimeout( () => {
            document.querySelector('.editable .text').focus()
          }, 10)
        }
        else if ( cancelBtn ){ // Clicked cancel button
          console.log('cancel create new')
          cancelNewTodo()
          hideEditWidget()
        }
        else if ( noteItem ){
          cancelNewTodo()
          hideEditWidget()
          viewNote(noteItem)
        }
        else { // Clicked anywhere else
          console.log('outside cancel new')
          cancelNewTodo()
          hideEditWidget()
        }
      } 
      else if ( status === 'editingTodo'){ 
        if( todoItem ){ // Clicked on todo item
          if ( todoItem !== document.querySelector('.editable')){ // Clicked on non-current todo item
            cancelTodoEdit()
            editTodo(todoItem)
            showEditWidget(todoItem)
          }
          else { // Clicked on current todo item
            // do nothing
          }
        }
        else if ( cancelBtn ){ // Clicked cancel button
          cancelTodoEdit()
        }
        else if ( saveBtn ){ // Clicked save button
          console.log('save edit')
          // save to db
          saveTodoEdit()
          hideEditWidget()
        }
        else if ( addTodoBtn ){ // Clicked add button
          // Don't save or cancel
          // Refocus on element so user knows they must interact before adding another item
          setTimeout( () => {
            document.querySelector('.editable .text').focus()
          }, 10)
        }
        else if ( deleteBtn ){ // Clicked delete button
          // Delete item and close widget
          deleteTodo(document.querySelector('#todos-collection .editable').dataset.id)
          hideEditWidget()
        }
        else if ( noteItem ){
          cancelTodoEdit()
          hideEditWidget()
          viewNote(noteItem)
        }
        else { // Clicked anywhere else
          cancelTodoEdit()
          hideEditWidget()
        }
      }
      else if ( status === 'editingNote'){
        if( saveNoteBtn || cancelNoteBtn || deleteNoteBtn ){ // click on btns
          if( saveNoteBtn ){
            // when saving, check if id exists already, if so, save edit, if not, save new
            const idExists = Object.keys(noteData).find( i => i === noteModal.dataset.id ) ? true : false
            if( idExists ){
              saveNoteEdit()
            } else {
              saveNewNote()
            }
            closeNote()
          } else if ( cancelNoteBtn ) {
            console.log('cancel')
            if( noteModal.classList.contains('new-note') ){
              closeNote()
            } else {
              toggleSaveEditBtn()
              removeNoteEditable()
              //re-populate original note because cancelled edit
              let modalID = activeNoteModal.dataset.id
              let noteItem = document.querySelector('#notes-collection [data-id="' + modalID + '"]' )
              console.log(modalID, noteItem)
              viewNote(noteItem)
            }
          } else if ( deleteNoteBtn ) {
            deleteNote( noteModal.dataset.id )
            closeNote()
          }
        }
        else if ( activeNoteModal ){ // click inside
          if( e.target.closest('.title')){
            e.target.closest('.title').focus()
            const toolbar = e.target.closest('.title').closest('.editor-wrapper').querySelector('.toolbar')
            const toolbarClose = document.querySelector('#modal-note .content').closest('.editor-wrapper').querySelector('.toolbar')
            toolbar.style.display = 'flex'
            toolbarClose.style.display = 'none'
          } else if ( e.target.closest('.content')){
            e.target.closest('.content').focus()
            const toolbar = e.target.closest('.content').closest('.editor-wrapper').querySelector('.toolbar')
            const toolbarClose = document.querySelector('#modal-note .title').closest('.editor-wrapper').querySelector('.toolbar')
            toolbar.style.display = 'flex'
            toolbarClose.style.display = 'none'
          } else if ( !e.target.closest('.toolbar') && !e.target.closest('.modal-content.editable') ){
            const toolbars = document.querySelectorAll('.editor-wrapper .toolbar')
            toolbars.forEach( tb => tb.style.display = 'none')
          }
        }
        else {
          console.log('clicked outside ') // click outside
          closeNote()
        }
      }
/*  */
/*  */
      else if ( status === 'viewingNote'){
        if( editNoteBtn || cancelNoteBtn || deleteNoteBtn ){ // click on btns
          if( editNoteBtn ){
            // make note editable
            // make toolbar viewable and functional
            toggleSaveEditBtn()
            editNote()
          } else if ( cancelNoteBtn ) {
            console.log('cancel')
            closeNote()
          } else if ( deleteNoteBtn ) {
            deleteNote( noteModal.dataset.id )
            closeNote()
          }
        }
        else if (activeNoteModal){
          // do nothing
        }
        else {
          console.log('clicked outside ') // click outside
          closeNote()
        }
      }
      else { // there is a status other than those accounted for
        console.error('Unhandled note status')
      }
      
    }
    else { // there is no status set. status is null.
      if ( addTodoBtn ){ // Clicked on addTodoBtn
        createNewTodo()
        showEditWidget(document.querySelector('#todos-collection .editable'))
      }
      else if ( addNoteBtn ) { // Clicked on addNoteBtn
        createNewNote()
      }
      else if ( todoItem ) { // Clicked a todo item
        editTodo( todoItem )
        showEditWidget( todoItem )
      }
      else if ( noteItem ) { // Clicked a note item
        viewNote( noteItem )
      }
    }

  }

  /****************** 
   * 3rd Party Libraries Setup
  ******************/

  (function initiateSortable(){
    Sortable.create(todosCollection, { // SortableJS library
      ghostClass: 'ghost',
      animation: 100,
      handle: '.drag',
      onStart: startTodoSortHandler,
      onEnd: endTodoSortHandler
    })

    Sortable.create(notesCollection, { // SortableJS library
      ghostClass: 'ghost',
      animation: 100,
      handle: '.drag',
      onStart: startNoteSortHandler,
      onEnd: endNoteSortHandler
    })
  })()

  function startTodoSortHandler(e){
    // Only change 'original data' when saving order and reset to {}
    if( Object.keys(originalTodoData).length === 0 ){
      for( let id in todoData){
        originalTodoData[id] = {
          id: todoData[id].id,
          order: todoData[id].order
        }
      }
    }
  }

  function endTodoSortHandler(e){
    const collection = Array.from(e.from.children)
    collection.forEach( (item, i) => {
      todoData[item.dataset.id].order = i + 1
    })
    saveTodoOrder()
  }

  function startNoteSortHandler(e){
    // Only change 'original data' when saving sort and reset to {}
    if( Object.keys(originalNoteData).length === 0 ){
      for( let id in noteData){
        originalNoteData[id] = {
          id: noteData[id].id,
          order: noteData[id].order
        }
      }
    }
  }

  function endNoteSortHandler(e){
    const collection = Array.from(e.from.children)
    collection.forEach( (item, i) => {
      noteData[item.dataset.id].order = i + 1
    })
    status = 'pendingNoteOrderSave'
    saveNoteOrder()
  }

  function saveTodoOrder(){
    const data = todoData
    /* Only save if order changed */
    if( dataObjectsAreEqual( originalTodoData, data )){
      console.log('re-sorted to same order, db not queried')
    }
    else {
      saveAllTodosFromLocal(data)
      console.log('todo sort order saved')
    }
    M.toast({html: 'Todo Order Saved'})
    status = null
    originalTodoData = {}
  }

  function saveNoteOrder(){
    const data = noteData
    /* Only save if order changed */
    if( dataObjectsAreEqual( originalNoteData, data )){
      console.log('re-sorted notes to same order, db not queried')
    }
    else {
      saveAllNotesFromLocal(data)
      console.log('note sort order saved')
    }
    M.toast({html: 'Note Order Saved'})
    status = null
    originalNoteData = {}
  }

  // Materialize JS Setup
  document.addEventListener('DOMContentLoaded', function(){
    const modals = document.querySelectorAll('.modal:not(#modal-note)')
    M.Modal.init(modals)
    M.Modal.init(document.querySelector('#modal-note'), {dismissible: false})
    const dropdowns = document.querySelectorAll('.dropdown-trigger')
    M.Dropdown.init(dropdowns)
  })

  // TextEditor Functionality
  new TextEditor(document.querySelector('#modal-note .title'), controllersTitle)
  new TextEditor(document.querySelector('#modal-note .content'), controllersMain)

  /************* 
   * Misc. Utility Functions
  **************/

  function getUniqueID(){
    let str =  Math.random().toString(36) + Date.now().toString(36)
    str = str.replace('0.','')
    return str.slice(0, str.length)
  }

  function dataObjectsAreEqual(d1, d2){ // only works with objects of objects, no functions, arrays.
    const type = Object.prototype.toString.call(d1)
    if( type !== Object.prototype.toString.call(d2)){ return false}
    if(Object.keys(d1).length !== Object.keys(d2).length){ return false}
    for(let key in d1){
      for(let value in d1[key]){ // only checks fields that exist in first object. Ignores timestamps
        if(d1[key][value] === d2[key][value]){continue}
        else {return false}
      }
    }
    return true
  }

  return {
    setupUI: setupUI,
    buildTodos: buildTodos,
    buildNotes: buildNotes
  }
})()

/*=========== Pending Updates ===============/

/*************
 High Priority
**************/

// Click button to complete todo
// Message at bottom to show success/failures
  // Simulate a failure?

// Note title character limit
  // Don't allow pasting into title/ multiline issues

// limit character count
// Don't allow empty/verification
// Firestore rules!!

// Keyboard listeners
 // For note editing
 // Esc to close any modal
 // Tab change to note editing? For accessability

// Only show save button after edit
// Note verification


// Display error message on signup and signin

/*************
 Lower Priority
**************/

// Quick Todo Delete option
// Undo Delete/Changes
// Drag elements and reorder locally, timer to send new order after x time in case keep reordering 

/*************
 Future Possibilities
**************/

// User levels: Free, Premium, Etc. (Testing firebase account level implementation options )
// User messaging/interaction of some kind
// Note comments
// Calendar ideas. Due dates.
// Reminders / Push notifications
