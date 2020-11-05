import { Component, OnInit } from '@angular/core';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import  firebase from 'firebase/app';
@Component({
  selector: 'app-cloud-list',
  templateUrl: './cloud-list.page.html',
  styleUrls: ['./cloud-list.page.scss'],
})
export class CloudListPage implements OnInit {
  cloudFiles = [];
  constructor(private iab: InAppBrowser) { }

  ngOnInit() {
    this.loadFiles();
  }

  loadFiles(){
    this.cloudFiles = [];

    const storageRef = firebase.storage().ref('files');
    storageRef.listAll().then(result => {
      result.items.forEach(async ref => {
        this.cloudFiles.push({
          name: ref.name,
          full: ref.fullPath,
          url: await ref.getDownloadURL(),
          ref: ref
        });
      });
    });
    
  }
  openExternal(url) {
    this.iab.create(url);
  }
 
  deleteFile(ref: firebase.storage.Reference) {
    ref.delete().then(() => {
      this.loadFiles();
    });
  }

}
