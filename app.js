import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import passport  from 'passport';
import  passportLocalMongoose  from 'passport-local-mongoose';
import flash from 'connect-flash';


const port = 3000;
const app = express();
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'))
app.use(session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash())
mongoose.connect("mongodb+srv://todolistnew:test123@cluster0.bms1tjx.mongodb.net/?retryWrites=true&w=majority").then(()=>console.log("database connected")).catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
    username:String,
    passpord:String,
    notes :[
        {
            content:String,
        }
    ]
});
UserSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("user",UserSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get('/',(req,res)=>{
    res.redirect('/login');
})
app.get('/index', async(req,res)=>{
    if(req.isAuthenticated()){
        const presentUserId = req.user._id;
        const notes = await User.find({_id:presentUserId},{_id:0,username:1,notes:1});
        res.render('index.ejs',{
            messages:req.flash(),
            list:notes,
            auth:true
        });
        
    }else{
        req.flash('error','Login First');
        res.redirect('/login');
    }
})
app.get('/login',(req,res)=>{
    res.render("login.ejs",{messages:req.flash(),auth:false});
})


app.post("/login", (req, res) => {
    passport.authenticate("local", {
      successRedirect: "/index",
      failureRedirect: "/login",
      failureFlash: true,
    })(req, res)
  });


app.get('/register',(req,res)=>{
    res.render("register.ejs",{messages:req.flash(),auth:false});
})
app.post('/register',(req,res)=>{
    User.register({username:req.body['username'].split(" ").join("")},req.body['password'],function(err,user){
        if(err){
            req.flash('error',err.message);
            res.redirect('/register');
        }else if(req.body['password'] != req.body['re-password'] ){
            req.flash('error','Password Doesnt Match!');
            res.redirect('/register');
        }else if(req.body['username'].length < 8 ){
            req.flash('error','Username must be atleast 8 Characters');
            res.redirect('/register');
        }
        else{
            passport.authenticate('local',{
                successRedirect: "/index",
                failureRedirect: "/login",
                failureFlash: true,
              })(req, res);
        }
    })
})
app.get('/add',async (req,res)=>{
    if(req.isAuthenticated()){
        res.render('addnotes.ejs',{messages:req.flash(),auth:true});
    }else{
        res.redirect('login');
    }

})
app.post('/add',async (req,res)=>{
    if(req.isAuthenticated()){
        const presentUserId = req.user._id;
        const todoContent = req.body['todocontent'];
        await User.updateOne({_id:presentUserId},{$push:{
            notes:{content:todoContent}
        } });
        req.flash('success','Task Successfully Added');
        res.redirect('/index');
        
    }else{
        req.flash('error','Login First');
        res.redirect('login');
    }
})
app.post('/delete',async(req,res)=>{
    if(req.isAuthenticated()){
        const presentUserId = req.user._id;
        const presentUserNoteId = req.body['delete'];
        
        await User.updateOne(
            {_id:presentUserId},
            {$pull:{
                notes:{_id:presentUserNoteId},
            }}
        );
        req.flash('success','Task Successfully Deleted');
        res.redirect('/index');
        
    }else{
        req.flash('error','Login First');
        res.redirect('login');
    }
})
app.get('/update',async (req,res)=>{
    if(req.isAuthenticated()){
        const presentUserId = req.user._id;
        res.render('update.ejs',{
            noteId: req.query.update,
            oldcontent : await User.find({'notes._id':req.query.update},{'notes.content.$':1,_id:0}),
            messages:req.flash(),
            auth:true
        });
        
    }else{
        req.flash('error','Login First');
        res.redirect('login');
    }
})
app.post('/update',async (req,res)=>{
    const presentUserId = req.user._id;
    const presentUserNoteId = req.body['update'];
    const contentUpdate = req.body['updatecontent'];
    if(req.isAuthenticated()){
        await User.updateOne({'notes._id':presentUserNoteId},
            {$set: {'notes.$.content':contentUpdate}}  
        );
        req.flash('success','Task Successfully Update');
        res.redirect('/index');
    }else{
        req.flash('error','Login First');
        res.redirect('login');
    }
})
app.get('/view/:id/:num',async(req,res)=>{
    const presentUserNoteId = req.params['id'];
    const number = req.params['num']

    if(req.isAuthenticated()){
        res.render('viewnote.ejs',{
            viewContent : await User.find({'notes._id':presentUserNoteId},{'notes.content.$':1,_id:0}),
            num :number,
            noteid :presentUserNoteId,
            messages:req.flash(),
            auth:true
        })
        
    }else{
        req.flash('error','Login First');
        res.redirect('login');
    }
})
app.get('/logout',(req,res)=>{
    req.logout((err)=>{
        if(err){
            console.log(err);
        }
    });
    res.redirect('/');
})
app.get('*', function(req, res){
    res.status(404);
    res.render('pagenotfound.ejs',{
        messages:req.flash(),
        auth:false
    })

  });

app.listen(port,()=>{
    console.log("running on 3000")
})
