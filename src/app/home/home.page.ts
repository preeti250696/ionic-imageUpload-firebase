import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Camera, PictureSourceType, CameraOptions } from '@ionic-native/Camera/ngx'
import { FilePath } from '@ionic-native/file-path/ngx';
import { File, FileEntry } from '@ionic-native/File/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { ActionSheetController, LoadingController, Platform, ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { AngularFireStorage } from '@angular/fire/storage';
const STORAGE_KEY = 'my_images';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  images = [];
  uploadProgress = 0;
  constructor(private camera: Camera, private file: File, private http: HttpClient, private webview: WebView, private actionsheetCtrl: ActionSheetController, private toastCtrl: ToastController, private storage: Storage, private plt: Platform, private loadingCtrl: LoadingController, private ref: ChangeDetectorRef, private filePath: FilePath, private firebaseStorage: AngularFireStorage) { }
  ngOnInit() {
    this.plt.ready().then(() => {
      this.loadStoredImages();
    })
  }
  loadStoredImages() {
    this.storage.get(STORAGE_KEY).then(images => {
      if (images) {
        let arr = JSON.parse(images);
        this.images = [];
        for (let img of arr) {
          let filePath = this.file.dataDirectory + img;
          let resPath = this.pathForImage(filePath);
          this.images.push({ name: img, path: resPath, filePath: filePath });
        }
      }
    })
  }
  pathForImage(img) {
    if (img == null) {
      return '';
    } else {
      let converted = this.webview.convertFileSrc(img);
      return converted;
    }

  }
  async presentToast(text) {
    const toast = await this.toastCtrl.create({
      message: text,
      position: 'bottom',
      duration: 3000
    });
    toast.present();
  }
  async selectImage() {
    const actionSheet = await this.actionsheetCtrl.create({
      header: 'Select Image source',
      buttons: [{
        text: 'Load from library',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY)
        }
      },
      {
        text: 'Use Camera',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.CAMERA);
        }
      },
      {
        text: 'Cancel',
        role: "cancel"
      }
      ]
    });
    await actionSheet.present();
  }
  takePicture(sourceType: PictureSourceType) {
    var options: CameraOptions = {
      quality: 100,
      sourceType: sourceType,
      saveToPhotoAlbum: false,
      correctOrientation: true
    };
    this.camera.getPicture(options).then(imagePath => {
      if (this.plt.is('android') && sourceType === this.camera.PictureSourceType.PHOTOLIBRARY) {
        this.filePath.resolveNativePath(imagePath)
          .then(filePath => {
            let correctPath = filePath.substr(0, filePath.lastIndexOf('/') + 1);
            let currentName = imagePath.substring(imagePath.lastIndexOf('/') + 1, imagePath.lastIndexOf('?'));
            const ext = '.jpg';
            const d = Date.now();
            const newName = `${d}.${ext}`;
            this.copyFileToLocal(correctPath, currentName, newName);
          });
      } else {
        var currentName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
        var correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1)
        const ext = 'jpg';
        const d = Date.now();
        const newName = `${d}.${ext}`;
        this.copyFileToLocal(correctPath, currentName, newName)
      }
    })
  }

  copyFileToLocal(path, currentName, newName) {
    console.log(path, currentName, newName);
    this.file.copyFile(path, currentName, this.file.dataDirectory, newName).then(success => {
      this.updateStoredImages(newName);
    }, err => {
      this.presentToast('Error while storing file');
    })
  }
  updateStoredImages(name) {
    this.storage.get(STORAGE_KEY).then(images => {
      let arr = JSON.parse(images);
      if (!arr) {
        let newImages = [name];
        this.storage.set(STORAGE_KEY, JSON.stringify(newImages));
      } else {
        arr.push(name);
        this.storage.set(STORAGE_KEY, JSON.stringify(arr));
      }
      let filePath = this.file.dataDirectory + name;
      let resPath = this.pathForImage(filePath);
      let newEntry = {
        name: name,
        path: resPath,
        filePath: filePath
      };

      this.images = [newEntry, ...this.images];
      this.ref.detectChanges();
    })
  }
  startUpload(imgEntry) {
    console.log('start', imgEntry);
    this.file.resolveLocalFilesystemUrl(imgEntry.filePath)
      .then(entry => {
        (<FileEntry>entry).file(file => this.uploadFile(file, imgEntry))
      })
      .catch(err => {
        this.presentToast('Error while reading file.');
      });
  }
  async uploadFile(file, imgEntry) {
    console.log('file upload:', file);
    console.log('images', imgEntry);
    const path = imgEntry.filePath.substr(0, imgEntry.filePath.lastIndexOf('/') + 1);
    const type = this.getMimeType(file.name.split('.').pop());
    const buffer = await this.file.readAsArrayBuffer(path, file.name);
    const fileBlob = new Blob([buffer], type);

    const randomId = Math.random()
      .toString(36)
      .substring(2, 8);
    const loading = await this.loadingCtrl.create({
      message: 'Uploading image...',
    });
    await loading.present();
    const uploadTask = this.firebaseStorage.upload(
      `files/${new Date().getTime()}_${randomId}`,
      fileBlob
    );

    uploadTask.percentageChanges().subscribe(change => {
      this.uploadProgress = change;
    });

    uploadTask.then(async res => {
      loading.dismiss();
      const toast = await this.toastCtrl.create({
        duration: 3000,
        message: 'File upload finished!'
      });
      toast.present();
    });
  }

  getMimeType(fileExt) {
    if (fileExt == 'wav') return { type: 'audio/wav' };
    else if (fileExt == 'jpg') return { type: 'image/jpg' };
    else if (fileExt == 'mp4') return { type: 'video/mp4' };
    else if (fileExt == 'MOV') return { type: 'video/quicktime' };
  }

}
