# cdnfly

Fastest and easiest cloud storage for hosting websites, backups and almost anything else.  

For in-house usage for now. Will soon write all the help to how to generate access code and fetch API key to start downloading/uploading files.  
Thank you for your interest.

More help coming soon.

### **Usage:**

```
var cdnfly = require("cdnfly")();
cdnfly.downloadFile(config, remotePath, localPath);
cdnfly.uploadFile(config, remotePath, localPath);
cdnfly.uploadLink(config, remotePath, link);
cdnfly.readFile(config, remotePath);
cdnfly.writeFile(config, remotePath, contents, contentType); // ex: application/json
cdnfly.list(config, remotePath);
```

