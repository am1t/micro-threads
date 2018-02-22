module.exports = {
    ensureAuthenticated: function(req, res, next){
        if(req.isAuthenticated()){
            return next();
        } 
        req.flash('error_msg', 'User not authenticated');
        res.redirect('/users/login');
    }
}