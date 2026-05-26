const bcrypt = require('bcrypt');

// Generate hash for admin password
bcrypt.hash('admin', 10, (err, hash) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    console.log(hash);
});
