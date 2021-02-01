import firebase from "firebase";


const userConfig = {
    apiKey: process.env.REACT_APP_API_KEY_USER,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN_USER,
    databaseURL: process.env.REACT_APP_DATABASE_URL_USER,
    projectId: process.env.REACT_APP_PROJECT_ID_USER,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET_USER,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID_USER,
    appId: process.env.REACT_APP_APP_ID_USER,
};

class Manager {
    constructor(props) {
        this.props = props;

        //// Init Firebase ////
        firebase.initializeApp(userConfig);
        this.auth = firebase.auth();
        this.db = firebase.database();

        // Turn off Authentication Persistence
        this.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    }

    // Create User
    createUser = (email, password) => this.auth.createUserWithEmailAndPassword(email, password);

    // Sign In
    signIn = (email, password) => this.auth.signInWithEmailAndPassword(email, password);

    // Sign Out
    signOut = () => this.auth.signOut();

    // Password Email Reset
    passwordReset = (email) => this.auth.sendPasswordResetEmail(email);

    onAuthUserListener = (next, fallback) =>
        this.auth.onAuthStateChanged(authUser => {
            if (authUser) {
                this.user(authUser.uid)
                    .once('value')
                    .then(snapshot => {
                        const dbUser = snapshot.val();

                        // default empty roles
                        if (!dbUser.roles) {
                            dbUser.roles = [];
                        }

                        // merge auth and db user
                        authUser = {
                            uid: authUser.uid,
                            email: authUser.email,
                            ...dbUser,
                        };

                        next(authUser);
                    });
            } else {
                fallback();
            }
        });

    user = uid => this.db.ref(`users/${uid}`);
    users = () => this.db.ref('users');

    currentUser = () => { return {
        email: this.auth.currentUser.email,
        uid: this.auth.currentUser.uid
    }}

    refs = {
        reports: () => {
            let ref = this.db.ref("reports")
            ref.orderByChild("user/uid").equalTo(this.auth.currentUser.uid)
            return ref
        }
    }


    // TODO Update
    //// Requests ////
    request = {
        postForm: async function(_title, _description, _urg, _cat) {

            let d = new Date();
            let currentDatetime = {
                year: d.getFullYear(),
                month: d.getMonth(),
                day: d.getDay(),
                hour: d.getHours(),
                minute: d.getMinutes(),
            }

            let key = this.db.ref().child('reports').push().key;

            let data = {
                title: _title,
                urg: _urg,
                cat: _cat,
                id: key,
                status: 0,
                user: this.currentUser(),
                comments: {
                    0: {
                        user: this.currentUser(),
                        comment: _description,
                        datetime: currentDatetime,
                    }
                },
                datetime: currentDatetime,
            }
            
            await this.db.ref('reports/' + key).set(data);

            return key
        }.bind(this),

        getForms: async function() {
            let uid = this.auth.currentUser.uid;

            let data;
            let ref = this.db.ref("reports");
            await ref
                .orderByChild("user/uid")
                .equalTo(uid)
                .once("value")
                .then(function (snapshot) {
                    data = snapshot.val()
                })
            return data;
        }.bind(this),

        getForm: async function(id) {

            let data;
            let ref = this.db.ref("reports/" + id);
            await ref.once("value").then(function (snapshot) {
                data = snapshot.val()
            })
            return data;
        }.bind(this),

        updateForm: async function(id, data) {
            await this.db.ref("reports/" + id).set(data);
        }.bind(this),

        addComment: async function(id, comment) {
            let data = await this.request.getForm(id)

            let d = new Date();
            let currentDatetime = {
                year: d.getFullYear(),
                month: d.getMonth(),
                day: d.getDay(),
                hour: d.getHours(),
                minute: d.getMinutes(),
            }

            let newComments = data.comments
            newComments.push({
                comment: comment,
                datetime: currentDatetime,
                user: this.currentUser(),
            })

            await this.db.ref("reports/" + id + "/comments").set(newComments);
        }.bind(this)
    }
}

export default Manager;
