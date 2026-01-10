module.exports = {
  apps : [
    {
      name   : "smart-factory-nodejs",
      script : "./server.js",
      env_production: {
         NODE_ENV: "production"
      }
    },
    {
      name   : "smart-factory-python",
      script : "./app.py",
      interpreter: "python", // ใช้ "python" เพื่อความเข้ากันได้บน Windows
      env_production: {
         NODE_ENV: "production"
      }
    }
  ]
}