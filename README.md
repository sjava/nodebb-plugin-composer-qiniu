# Qiniu Composer for NodeBB

nodebb 上传文件到七牛的插件，之前有一个 [nodebb-plugin-qiniu-img](https://www.npmjs.com/package/nodebb-plugin-qiniu-img)，但是工作机制是先上传的本地服务器，然后再从服务器上传到七牛，效率很低，而且更严重的问题是大文件上传总是莫名失败，判断可能是七牛的 Node.js 的 SDK 有问题。为了解决这个问题，最终决定，直接修改 composer，从前端直接上传文件到七牛服务器。

## Screenshots

### Desktop
![Desktop Composer](screenshots/desktop.png?raw=true)

### Mobile Devices
![Mobile Composer](screenshots/mobile.png?raw=true)
