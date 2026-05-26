const bcrypt = require('bcrypt');
const password = 'admin';

// Create hash
bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Hash error:', err);
        return;
    }
    console.log('Hash:', hash);

    // Immediately verify
    bcrypt.compare(password, hash, (err, res) => {
        console.log('Verify result:', res);
        if (err) console.error('Compare error:', err.message);
    });
});
