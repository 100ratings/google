let i = 0;
let selfieCam = false;
const player = document.getElementById('player');
let canvas = document.getElementById("canvas");
let word = "";
let cImgs = ["_img/cunt/01.jpg","_img/cunt/02.jpg","_img/cunt/03.jpg","_img/cunt/04.jpg","_img/cunt/05.jpg","_img/cunt/06.jpg","_img/cunt/07.jpg","_img/cunt/08.jpg",];

let wImgs = ["https://artwow-images.s3.amazonaws.com/wanker-funny-tea-towel-by-adam-regester-teatowelmediumlandscape-62eaddb4000840.19161797.png","https://www.lovelayladesigns.co.uk/image/cache/catalog/product/RR010-800x800.jpg","http://cdn.ecommercedns.uk/files/3/214193/7/5196967/wanker---solid-black.jpg","https://www.shutterstock.com/image-photo/sign-saying-dont-be-wanker-260nw-2131770121.jpg","https://02dd5f64038d9e2d7aae-56d86e996af26366aec8b255ed6f7c7b.ssl.cf3.rackcdn.com/img-xwhQAbbw-large.jpg","https://i.ytimg.com/vi/4FekdX1b7B0/maxresdefault.jpg","https://www.scribbler.com/Images/Product/Default/xlarge/DM1667.jpg","https://bfv7pmf0.tinifycdn.com/images/fullsize/products/DMA-496.jpg","https://i.stack.imgur.com/nazTY.jpg"];

let iImgs = ["https://womensprizeforfiction.co.uk/wp-content/uploads/The_Idiot_by_Elif_Batuman-ScreenRes.jpg","https://images-eu.ssl-images-amazon.com/images/I/81za5W0P3pL._AC_UL900_SR615,900_.jpg","https://flxt.tmsimg.com/assets/p22052756_b_v13_aa.jpg","https://i.scdn.co/image/ab67616d00001e0208a1b1e0674086d3f1995e1b","https://images.foyles.co.uk/xlarge/books/img/1/9/0/9781909269347.jpg","https://images.squarespace-cdn.com/content/v1/5c894a9d92441b651d911705/1556047789011-GRKOHWR55QEV53VRCPC3/I%27mRight-cover.png?format=1000w","https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781627938525/the-idiot-9781627938525_hr.jpg","https://thumbs.dreamstime.com/b/certified-idiot-sign-stamp-white-background-vector-illustration-certified-idiot-sign-stamp-191231448.jpg","https://i.ytimg.com/vi/RpXLpfMWrlY/maxresdefault.jpg"];

player.addEventListener('touchstart', shutterPress);
player.addEventListener('click', shutterPress);


function setupVideo() {
	let camera = 'environment';
		
	navigator.mediaDevices.getUserMedia({
		audio: false,
		video: {
			facingMode: camera
		}
	})
	.then(stream => player.srcObject = stream)
	.catch(console.error);
}

document.querySelectorAll(".word").forEach(box => 
	box.addEventListener("click", function(){
		word = this.getAttribute('data-type');
		console.log(`word is ${word}`);
		
		updateUIWithWord(word);
	})
)

document.querySelector("#wordbtn").addEventListener("click", function (e) {
	e.preventDefault();
	word = document.querySelector("#wordinput").value;
	console.log(`word is ${word}`);
	updateUIWithWord(word);
});

function updateUIWithWord(word) {
	document.querySelector("#word-container").remove();
	document.querySelector(".D0h3Gf").value = word;
	document.querySelectorAll("span.word").forEach(wordSpan => {
		wordSpan.innerHTML = word
	});
	if (word == "cunt" || word == "wanker" || word == "veado") {
		loadLocalImg(word);
	} else {
		loadImg(word);
	}
}

	
window.addEventListener('load', setupVideo, false);

function shutterPress(e) {
	e.preventDefault();
	console.log('hit button');
	
	const video = document.querySelector('video');
	const mediaStream = video.srcObject;
	const tracks = mediaStream.getTracks();
	const track = mediaStream.getVideoTracks()[0];
	
	const context = canvas.getContext("2d");
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	context.drawImage(video, 0, 0, canvas.width, canvas.height);
	
	const photo = document.querySelector('#spec-pic');
	const data = canvas.toDataURL("image/png");
	photo.setAttribute("src", data);

	
	track.stop();
	tracks.forEach(track => track.stop())
	
	player.remove();
}


function loadLocalImg(word) {
	let array = cImgs;
	if (word == "wanker") {
		array = wImgs;
	}
	if (word == "veado") {
		array = iImgs;
	}
	
	let i = 0;
	document.querySelectorAll(".i").forEach(image => {
		image.querySelector("img").src = array[i% array.length];
		i++;
	});
}


function loadImg(word) {
	let wordToSearch = word;
	  const url = "https://api.unsplash.com/search/photos?query="+wordToSearch+"&per_page=9&client_id=qrEGGV7czYXuVDfWsfPZne88bLVBZ3NLTBxm_Lr72G8";
	  const imageDiv = document.querySelector('#images');
		fetch(url)
		.then(response => {
			return response.json();
		})
		.then(data => {
			console.log(`returned ${data.results.length} items`);
			
			let i = 0;
			document.querySelectorAll(".i").forEach(image => {
				image.querySelector("img").src = data.results[i % data.results.length].urls.small;
				image.querySelector(".desc").innerHTML = data.results[i % data.results.length].description;
				i++;
			});
		});
}

