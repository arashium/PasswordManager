var settingFile=chromeToPath('chrome://password/content/settings');
var passdlgFile='chrome://password/content/askpassdialog.xul';
var savedlgFile='chrome://password/content/savdialoge.xul';
var newdlgFile='chrome://password/content/newdialog.xul';
var settingsdlgFile='chrome://password/content/settingsdialog.xul';
var backUpFileName='backup';
var defaultCharSet='UTF-8';
var settings=[];
var currentLocation="";
var listConstantItems=[];
var listFilter="";
var password;
var currentContentPath="";
var currentContentText="";
var fileSeparator='/';

String.prototype.startsWith = function(str) {
               return (this.indexOf(str) === 0);
           }
String.prototype.endsWith = function(str) {
               return (this.lastIndexOf(str) === this.length-str.length);
           }

function initalize()
{
	var ex=exists(settingFile);
	if(ex)
	{
		settings=importUserData(settingFile);
		currentLocation=settings['settings']['workspace'];
		var again;
		do
		{
			again=false;
			var passwin=window.openDialog(passdlgFile,"enterpassword","modal,centerscreen");
			password=passwin.password;
			if(password!=null&&CryptoJS.MD5(password)!=settings['settings']['passmd5'])
			{
				alert('wrong password');
				again=true;
			}
		}while(again);
		if(password==null)
			return ;
		refreshList();
	}
	else//show setting
	{
		browseSettings();
	}
}

function browseSettings()
{
	checkChangesSave();
	var defpass=null;
	var deflocation=null;
	if(settings['settings']&&settings['settings']['workspace'])
		deflocation=settings['settings']['workspace'];
	if(password)
		defpass=password;
	var pref=window.openDialog(settingsdlgFile,"settings","modal,centerscreen",/*args*/defpass,deflocation);
	if(pref.password)
	{
		settings['settings']=[];
		settings['settings']['passmd5']=code=CryptoJS.MD5(pref.password);
		settings['settings']['workspace']=pref.workspace;
		exportUserData(settingFile,settings);
		currentLocation=pref.workspace;
		password=pref.password;
		refreshList();
	}
}

function backup()
{
	var currentTime = new Date();
	var dateLabel="_";
	dateLabel+=currentTime.getFullYear()+'-'; 
	dateLabel+=(currentTime.getMonth()+1) +'-';
	dateLabel+=currentTime.getDate()+'_'
	dateLabel+=currentTime.getHours()+';'; 
	dateLabel+=currentTime.getMinutes()+';'; 
	dateLabel+=currentTime.getSeconds(); 
	var fname="backup"+dateLabel;
	fname=prompt("Name of backup file:",fname);
	if(fname)
	{
		var megaText=""+currentTime+'\n';
		megaText+="file name: "+fname+'\n';
		megaText+="location: "+currentLocation+'\n';
		var separator="";
		for(var repeatIndex=60;repeatIndex>0;repeatIndex--)
			separator+='*';
		separator+='\n';
		megaText+=separator;
		for(var idx=0;idx<listConstantItems.length;idx++)
		{
			var item=listConstantItems[idx];
			var idxpath=currentLocation+fileSeparator+item;
			var idxcontent=readFile(idxpath,defaultCharSet);
			try
			{
				var dec=todecrypt(idxcontent,password);
				if(dec)
					idxcontent=dec;
			}
			catch(ex){}
			megaText+='* '+item+'\n';
			
			megaText+=idxcontent+'\n';
			megaText+=separator;
		}
		var location=currentLocation+fileSeparator+backUpFileName;
		if(!exists(location))
		{
			createFolder(location);
		}
		else if(!isDirectory(location))
		{
			removeFile(location);
			createFolder(location);
		}
		var fpath=location+fileSeparator+fname;
		megaText=toencrypt(megaText,password);
		writeFile(megaText,fpath,defaultCharSet);
	}

}

function openItemLocation()
{
	var location=currentLocation;
	var item=document.getElementById("dirList").selectedItem;
	if(item)
	{
		var location2=currentLocation+fileSeparator+item.label;
		if(exists(location2))
			location=location2;
	}
	openLocation(location);
}

function deleteItemFile()
{
	var item=document.getElementById("dirList").selectedItem;
	if(item)
	{
		var fpath=currentLocation+fileSeparator+item.label;
		if(exists(fpath)&&confirm("Are you sure to remove file:\n"+fpath))
		{
			removeFile(fpath);
			refreshList();
		}
	}
}

function decryptContent()
{
	var passwin=window.openDialog(passdlgFile,"enter password","modal,centerscreen");
	pass=passwin.password;
	if(pass)
		try
		{
			var dec=todecrypt(document.getElementById('contentAreaText').value,pass);
			if(dec&&dec!="")
			{
				document.getElementById('contentAreaText').value=dec;
				currentContentText=dec;
			}
			else
				alert('cannot decrypt the content with the given password');
		}
		catch(ex)
		{
			alert('problem in decryption');
		}
}

function encryptContent()
{
	var passwin=window.openDialog(passdlgFile,"enter password","modal,centerscreen");
	pass=passwin.password;
	if(pass)
		try
		{
			var en=toencrypt(currentContentText,pass);
			if(en&&en!="")
			{
				document.getElementById('contentAreaText').value=en;
				currentContentText=en;
			}
		}
		catch(ex)
		{
			alert('wrong password');
		}
}

function exists(path)
{
	var file = Components.classes['@mozilla.org/file/local;1']
		.createInstance(Components.interfaces.nsILocalFile);               
	file.initWithPath(path);
	return file.exists();
}

function createFolder(fpath)
{
	var file = Components.classes['@mozilla.org/file/local;1']
		.createInstance(Components.interfaces.nsILocalFile);               
	file.initWithPath(fpath);
	if(file.exists())
		file.remove(false);
	file.create(file.DIRECTORY_TYPE, 0666);
}

function newContent()
{
	var nd=window.openDialog(newdlgFile,"save data","modal,centerscreen",currentLocation);
	if(nd.ok)
	{
		var flocation=nd.fileLocation;
		var fname=nd.fileName;
		var fpath=flocation+fileSeparator+fname;
		writeFile("",fpath,defaultCharSet);
		refreshList();	
	}
}

function changeLocation()
{
	p=openDirDialog(currentLocation);
	if(p&&exists(p))
	{
		currentLocation=p;
		refreshList();
	}
}

function refreshList()
{
	document.getElementById('location').value=currentLocation;
	listConstantItems=directoryToList(currentLocation);
	refreshListFromItems();
}

function refreshListFromItems()
{
	var dirList=document.getElementById('dirList');
	listboxRemoveAllItems(dirList);
	var filter=document.getElementById('filter').value;
	for(idx=0;idx<listConstantItems.length;idx++) 
	{
		var item=listConstantItems[idx];
		if(item.toLowerCase().indexOf(filter.toLowerCase())>-1)
		{
			var newitem=dirList.appendItem(item);
			newitem.setAttribute('ondblclick',"onListItem('"+item+"');");			
		}
	}	
}

function checkChangesSave()
{
	if(document.getElementById('contentAreaText').value!=currentContentText)
		showSaveDialog();	
}

function onListItem(item)
{
	checkChangesSave();
	currentContentPath=currentLocation+fileSeparator+item;
	document.getElementById('fileNameIndicator').value=currentContentPath;
	document.getElementById('encryptionIndicator').value='+';
	document.getElementById('encryptionIndicator').setAttribute('style','color:red;');
	currentContentText=readFile(currentContentPath,defaultCharSet);
	try
	{
		var dec=todecrypt(currentContentText,password);
		if(dec&&dec!="")
		{
			currentContentText=dec;
			document.getElementById('encryptionIndicator').value='𐏋';
			document.getElementById('encryptionIndicator').setAttribute('style','color:green;');
		}
	}
	catch(ex)
	{
	}
	document.getElementById('contentAreaText').value=currentContentText;
}

function showSaveDialog()
{
	var sv=window.openDialog(savedlgFile,"save data","modal,centerscreen");
	switch(sv.value)
	{
		case "1":
			saveContentEncrypted();
			break;
		case "2":
			saveContentUnEncrypted();
			break;
		case "3":
			discardContentChanges();
			break;
	}
}

function discardContentChanges()
{
	document.getElementById('contentAreaText').value=currentContentText;
}

function saveContentEncrypted()
{
	if(currentContentPath.length==0)
		return ;
	currentContentText=document.getElementById('contentAreaText').value;
	var enc=toencrypt(currentContentText,password);
	writeFile(enc,currentContentPath,defaultCharSet);
}

function saveContentUnEncrypted()
{
	if(currentContentPath.length==0)
		return ;
	currentContentText=document.getElementById('contentAreaText').value;
	writeFile(currentContentText,currentContentPath,defaultCharSet);
}

function directoryToList(fullPath)
{
	var file = Components.classes['@mozilla.org/file/local;1']
		   .createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(fullPath);
	var children = file.directoryEntries;
	var child;
	var list = [];
	while (children.hasMoreElements()) 
	{
		child = children.getNext().QueryInterface(Components.interfaces.nsILocalFile);
		if(!child.isDirectory())
		{
			list.push(child.leafName);
		}
		else if(child.leafName!=backUpFileName)
		{
			var sublist=directoryToList(fullPath+fileSeparator+child.leafName);
			for(var sidx=0;sidx<sublist.length;sidx++)
			{
				var sitem=sublist[sidx];
				list.push(child.leafName+fileSeparator+sitem);
			}
		}
	}
	return list;
}

function listboxRemoveAllItems(elListBox)
{
    var myListBox = document.getElementById(elListBox);
    var count = elListBox.itemCount;
    while(count-- > 0){
        elListBox.removeItemAt(0);
    }
}

function openDirDialog(defPath)
{
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"]
					   .createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window,"Select Directory",nsIFilePicker.modeGetFolder);
	if(defPath&&exists(defPath))
	{
		var f = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		f.initWithPath(defPath);
		fp.displayDirectory=f;
	}
	var ret = fp.show();
	if (ret == nsIFilePicker.returnOK || ret == nsIFilePicker.returnReplace) 
	{
		applicationPath = fp.file.path;
		return applicationPath;
	}
	else
		return null;
}

function readFile(fpath,charset)
{
	var file = Components.classes['@mozilla.org/file/local;1']
		   .createInstance(Components.interfaces.nsILocalFile);    
	file.initWithPath(fpath);
	var fileStream = Components.classes['@mozilla.org/network/file-input-stream;1']
        	         .createInstance(Components.interfaces.nsIFileInputStream);
	fileStream.init(file, 1, 0, false);
	var converterStream = Components.classes['@mozilla.org/intl/converter-input-stream;1']
                      .createInstance(Components.interfaces.nsIConverterInputStream);
                      converterStream.init(fileStream, charset, fileStream.available(),
                      converterStream.DEFAULT_REPLACEMENT_CHARACTER);
	var out = {};
	converterStream.readString(fileStream.available(), out);
	var fileContents = out.value;
	converterStream.close();
	fileStream.close();
	return fileContents;
}

function writeFile(text,fpath,charset)
{
	var file = Components.classes['@mozilla.org/file/local;1']
		.createInstance(Components.interfaces.nsILocalFile);               
	file.initWithPath(fpath);
	if(file.exists())
		file.remove(false);
	file.create(file.NORMAL_FILE_TYPE, 0666);
	var fileStream = Components
		.classes['@mozilla.org/network/file-output-stream;1']
		.createInstance(Components.interfaces.nsIFileOutputStream);
	fileStream.init(file, 2, 0x200, false);
	var converterStream = Components
		.classes['@mozilla.org/intl/converter-output-stream;1']
		.createInstance(Components.interfaces.nsIConverterOutputStream);
	converterStream.init(fileStream, charset, text.length,
	Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
	converterStream.writeString(text);
	converterStream.close();
	fileStream.close();
}

function removeFile(fpath)
{
	var file = Components.classes['@mozilla.org/file/local;1']
		.createInstance(Components.interfaces.nsILocalFile);               
	file.initWithPath(fpath);
	if(file.exists())
		file.remove(false);
}

function openLocation(fpath)
{
	var file = Components.classes['@mozilla.org/file/local;1']
		.createInstance(Components.interfaces.nsILocalFile);               
	file.initWithPath(fpath);
	file.reveal();
}

function importUserData(fpath)
{
	var dataText=readFile(fpath,'UTF-16');
	var dataLines=dataText.split("\n");
	var dataHead="";
	var dataSection=[];
	var dataArray=[];
	for(var idx=0;idx<dataLines.length;idx++)
	{
		var line=dataLines[idx];
		if(line.startsWith('[')&&line.endsWith(']'))
		{
			if(Object.keys(dataSection).length>0)
			{
			   dataArray[dataHead]=dataSection;
			}
			dataHead=line.substring(1,line.length-1);
		}
		else if(line.indexOf(':'>-1))
		{
			var colonIndex=line.indexOf(':');
			var propertyName=line.substring(0,colonIndex);
			var propertyValue=line.substring(colonIndex+1);
			dataSection[propertyName]=propertyValue;
		}
	}
	if(Object.keys(dataSection).length>0)
	{
		dataArray[dataHead]=dataSection;
	}
	return dataArray;
}

function exportUserData(fpath,data)
{
	var text="";
    var firstHead=true;
	for (var keyHead in data)
		if(keyHead!='')
		{
			if(!firstHead)
			text+="\n";
			text+='['+keyHead+"]\n";
			var head = data[keyHead];
			for(var prop in head)
			{
				text+=prop+':'+head[prop]+"\n";
			}
			firstHead=false;
		}
   writeFile(text,fpath,'UTF-16');
}

function chromeToPath (aChromePath) {
 
   if ((!aChromePath) || !(/^chrome:/.test(aChromePath)))
      return null; //not a chrome url 
   var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces["nsIIOService"]);
   var uri = ios.newURI(aChromePath, "UTF-8", null);
   var cr = Components.classes['@mozilla.org/chrome/chrome-registry;1'].getService(Components.interfaces["nsIChromeRegistry"]);
   var rv = cr.convertChromeURL(uri).spec;
   if (/^file:/.test(rv))
      rv = this.urlToPath(rv);
   else
      rv = this.urlToPath("file://"+rv);
   return rv;
}

function urlToPath (aURL) {
 
   if (!aURL || !/^file:/.test(aURL))
      return null;
   var rv;
   var ph = Components.classes["@mozilla.org/network/protocol;1?name=file"]
        .createInstance(Components.interfaces.nsIFileProtocolHandler);
    rv = ph.getFileFromURLSpec(aURL).path;
   return rv;
}

function toencrypt(message, pass)
{
	var encrypted = CryptoJS.AES.encrypt(message, pass);
	return encrypted;
}

function todecrypt(message, pass)
{
	var decrypted = CryptoJS.AES.decrypt(message, pass);
	var utf8text=decrypted.toString(CryptoJS.enc.Utf8);
	return utf8text;
}

function isDirectory(fpath)
{
	var file = Components.classes['@mozilla.org/file/local;1']
	   .createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(fpath);
	return file.isDirectory();
}
