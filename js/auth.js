
// listen for auth status changes
let unsubscribe = null

auth.onAuthStateChanged( user => {
  console.log( "auth state change")
  if( user ){
    console.log(user)
    ui.setupUI(user)

    // listener to fire whenever change is made to document
    // returns function to call when unsubscribing
    unsubscribe = db.collection('users').doc(user.uid).onSnapshot( doc => {
      ui.buildTodos(doc.data().todos)
      ui.buildNotes(doc.data().notes)
    }, error => {
      console.log(  error.message )

    })
  }
  else {
    console.log('no user logged in')
    if( unsubscribe ) { 
      unsubscribe() 
      console.log('unsubscribed')
      unsubscribe = null
    }
    ui.setupUI(user)
  }
})

/* Sign Up with email and password */
const signUp_form = document.querySelector('#signup-form')
signUp_form.addEventListener( 'submit', (e) => {
  const email = signUp_form['signup-email'].value
  const password = signUp_form['signup-password'].value
  e.preventDefault()
  auth.createUserWithEmailAndPassword(email, password)
    .then( cred => {
      // create user doc 
      return db.collection('users').doc(cred.user.uid).set({
        todos: {},
        notes: {},
        completedTodos: {}
      })
    }).then( () => {
      // close modal
      const modal = document.getElementById('modal-signup')
      M.Modal.getInstance(modal).close()
      signUp_form.reset()
      M.toast({html: 'Welcome!'})
    })
    .catch( err => {
      console.error( err.message )
    })
})

/* Login with email and password */
const login_form = document.querySelector('#login-form')
login_form.addEventListener( 'submit', (e) => {
  const email = login_form['login-email'].value
  const password = login_form['login-password'].value
  e.preventDefault()
  auth.signInWithEmailAndPassword(email, password)
    .then( () => {
      // close modal
      const modal = document.getElementById('modal-login')
      M.Modal.getInstance(modal).close()
      login_form.reset()
    })
    .catch( err => {
      console.error( err.message )
    })
})

/* Sign in using Google */
const googleSignIn_btn = document.querySelector('.modal .modal-footer .google-signin')
googleSignIn_btn.addEventListener('click', googleSignIn)


/* Sing in using Google */
const googleSignUp_btn = document.querySelector('.modal .modal-footer .google-signup')
googleSignUp_btn.addEventListener('click', googleSignIn)

function googleSignIn(){
  // Using a popup.
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  auth.signInWithPopup(provider)
    .then( cred => {
      // If it's a first time user, create their document in users collection
      //   Could re-direct if user thinks they are signing in without knowing they don't yet have an account
      if( cred.additionalUserInfo.isNewUser ){
        return db.collection('users').doc(cred.user.uid).set({
          todos: {},
          notes: {},
          completedTodos: {}
        }).then( res => {
          console.log( res )
          M.toast({html: 'Welcome!'})
        })
      }
      else {
        M.toast({html: 'Welcome back!'})
      }
      return
    })
    .then( () => {
    // close modal
    const modal = document.getElementById('modal-signup')
    M.Modal.getInstance(modal).close()
  })
  .catch( err => {
    console.error( err.message )
  })
}

/* Sign Out */
document.getElementById('logout').addEventListener('click', () => auth.signOut() )


/* Create user doc on new user */

