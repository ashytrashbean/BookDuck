const baseUrl = "http://localhost:1337";

async function showAdmin(user){
    if(user.role === "Admin" || user.username === "admin"){
        document.querySelector('#adminSelection').style.display = "flex";
    }else{
        document.querySelector('#adminSelection').style.display = "none";
    }
}

async function uploadBook(event) {
    event.preventDefault();

    const token = localStorage.getItem("token");

    const formData = new FormData();

    const data = {
        title: document.querySelector("#bookTitle").value,
        author: document.querySelector("#bookAuthor").value,
    };

    const imageFile = document.querySelector("#bookCover").files[0];
    formData.append("files.cover", imageFile, imageFile.name);
    formData.append("data", JSON.stringify(data));

    try{
        await axios.post(`${baseUrl}/api/books`, formData, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "multipart/form-data" 
            }
        });
        alert("Book uploaded successfully!")
    }catch(error){
        console.error("Upload Failed: ", error);
    }
}

async function registerUser() {
    let regUsername = document.querySelector("#regUsername").value;
    let regEmail = document.querySelector("#regemail").value;
    let regPassword = document.querySelector("#regPassword").value;
    
    let newUser = {
        username: regUsername,
        email: regEmail,
        password: regPassword
    }
    
    await axios.post(`${baseUrl}/api/auth/local/register`,newUser);
    alert("Account created! Please log in.");
}

async function loginUser() {
    let username = document.querySelector("#username").value;
    let password = document.querySelector("#password").value;
    
    const loggedUser ={
        identifier: username,
        password: password
    };
    let response = await axios.post(`${baseUrl}/api/auth/local/`, loggedUser).then(response=>{
        localStorage.setItem("token", response.data.jwt)
        if(response.status === 200){
            window.location.href = "home.html"
        } else{
            alert("Either you dont have an account or you wrote something wrong")
        }
    })
    .catch(error =>{
        alert("Either you dont have an account or you wrote something wrong");
        console.log(error.response);
    });
}

async function renderBooks() {
    let response = await axios.get(`${baseUrl}/api/books?populate[reviews][populate]=*&populate[cover][populate]=*`);
    let books = response.data.data;

    const isLoggedIn = localStorage.getItem("token") !== null;

    const bookContainer = document.querySelector('#allBooks');
    bookContainer.innerHTML = "";

    books.forEach(book => {

        const reviews = book.reviews || [];
        let avgRating = 0;

        if(reviews.length > 0) {
            const sum = reviews.reduce((acc, rev) => acc + rev.rating, 0);
            avgRating = (sum / reviews.length).toFixed(1);
        }
        
        const ratingUI = isLoggedIn ? `
            <div class="rating-box">
                <select id="rating-${book.documentId}">
                    ${[1,2,3,4,5,6,7,8,9,10].map(num => `<option value="${num}">${num}</option>`).join('')}
                </select>
                <button onclick="addRating('${book.documentId}')">Rate</button>
            </div>` : "";

        const saveButton = isLoggedIn
            ? `<button type="button" onclick="saveBook('${book.documentId}')">Save to TBR</button>`
            : ``;

        bookContainer.innerHTML += `
        <div class="bookCard">
        <img src="${baseUrl}${book.cover?.url}" height="280"> <br>
        <h3>${book.title}</h3>
        <span>${book.author}</span>
        <span>${book.pages} pages</span>
        <span>released: ${book.release_date}</span>
        <span>Avg Rating: ⭐ ${avgRating} (${reviews.length})</span>
        ${ratingUI}
        ${saveButton}
        </div>`
    });

}

async function saveBook(bookID) {
    const token = localStorage.getItem("token")

    const userRes = await axios.get(`${baseUrl}/api/users/me`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const myUserId = userRes.data.documentId;

    try{
        await axios.put(`${baseUrl}/api/books/${bookID}`,{
                data: {
                // 'users' is the name of the relation field on the Book
                    users: {
                        connect: [myUserId] 
                    }
                }   
            },{
                headers:{"Authorization": `Bearer ${token}`}
        });
        alert("Book added to your TBR list!");
        location.reload()
    }
    catch(error){
        console.log("Error details:", error.response?.data);
        alert("Failed to save book. Check the console!");
    }

}

async function removeBook(bookID) {
    const token = localStorage.getItem("token")

    const userRes = await axios.get(`${baseUrl}/api/users/me`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const myUserId = userRes.data.documentId;

    try{
        await axios.put(`${baseUrl}/api/books/${bookID}`,{
                data: {
                // 'users' is the name of the relation field on the Book
                    users: {
                        disconnect: [myUserId] 
                    }
                }   
            },{
                headers:{"Authorization": `Bearer ${token}`}
        });
        alert("Book removed from your TBR list");
        location.reload()
    }
    catch(error){
        console.log("Error details:", error.response?.data);
        alert("Failed to remove book. Check the console!");
    }

}

async function addRating(bookID) {
    const token = localStorage.getItem("token");
    const score = document.querySelector(`#rating-${bookID}`).value;

    const userRes = await axios.get(`${baseUrl}/api/users/me`, {
        headers: {"Authorization": `Bearer ${token}`}
    });

    const myUserId = userRes.data.documentId;

    try{
        axios.post(`${baseUrl}/api/reviews`,{
            data: {
                rating : parseInt(score),
                book: bookID,
                user: myUserId
            }
        },{
            headers: {"Authorization": `Bearer ${token}`}
        });
        alert("rating submitted");
        location.reload();
    } catch(error){
        console.error("rating failed:", error.response?.data);
        alert("You might have rated this book already");
    }
}

async function renderProfile(sortBy = "title", ratedSort = "rating") {

    let response = await axios.get(`${baseUrl}/api/users/me?populate[tbr_list][populate]=*&populate[reviews][populate][book][populate]=*`,{
        headers: {"Authorization": `Bearer ${localStorage.getItem("token")}`}
    });

    if(response.status === 200){
        const user = response.data;
        showAdmin(user)

        let myBooks = user.tbr_list || [];
    
        if (sortBy === "title" || sortBy === "author") {
            myBooks.sort((a, b) => a[sortBy].localeCompare(b[sortBy], 'sv'));
        }

        let tbrContainer = document.querySelector('#tbrDiv');
        tbrContainer.innerHTML = "";

        myBooks.forEach(book => {
            tbrContainer.innerHTML += `
            <div class="bookCard">
            <span>${book.author}</span>
            <h3>${book.title}</h3>
            <img src="${baseUrl}${book.cover?.url}" height="100"> <br>
            <span><strong>Pages:</strong> ${book.pages}</span>
            <span><strong>Released:</strong> ${book.release_date}</span>
            <button type="button" onclick="removeBook('${book.documentId}')">Remove from TBR</button>
            </div>`
        });

        let myReviews = user.reviews || [];

        if (ratedSort === "rating") {
            myReviews.sort((a, b) => b.rating - a.rating);
        } else if (ratedSort === "title" || ratedSort === "author") {
            myReviews.sort((a, b) => {
                return a.book[ratedSort].localeCompare(b.book[ratedSort], 'sv');
            });
        }

        let ratedContainer = document.querySelector('#ratedDiv');
        ratedContainer.innerHTML = "";
        myReviews.forEach(rev => {
            ratedContainer.innerHTML += `
                <div class="bookCard">
                    <span>${rev.book.author}</span>
                    <h3>${rev.book.title}</h3>
                    <p>Your Rating: ⭐ ${rev.rating}/10</p>
                </div>`
        });
    }
}

async function updateHeaderNames(token){
    // const token = localStorage.getItem("token")

    const userRes = await axios.get(`${baseUrl}/api/users/me`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const user = userRes.data
    const fullNameElements = document.querySelectorAll(".usersName");

    fullNameElements.forEach(el=>{
        let email = user.email;
        // console.log(email);
        if(email.includes('.')){
            let name = email.split('.')[0];
            name = name.charAt(0).toUpperCase()+name.slice(1)
    
            let lastName = email.split('.')[1];
            lastName = lastName.split('@')[0];
            lastName = lastName.charAt(0).toUpperCase()+lastName.slice(1)

            el.textContent = `${name} ${lastName}`;
        } else {
            el.textContent = user.username
        }

    });
}

function checkLogIn(){

    
    if(document.querySelector("#allBooks")){ renderBooks();}
    
    if(document.querySelector("#tbrDiv")){ renderProfile();}
    
    const tbrFilter = document.querySelector("#tbrFilter");
    if(tbrFilter){
        tbrFilter.addEventListener('change',(event) =>{
            renderProfile(event.target.value)
        })
    }

    const ratedFilter = document.querySelector("#ratedFilter");
    if (ratedFilter) {
        ratedFilter.addEventListener('change', (event) => {
            const currentTBRSort = document.querySelector("#tbrFilter").value;
            renderProfile(currentTBRSort, event.target.value);
        });
    }

    const logOut = document.querySelector("#logoutBtn");
    if(logOut){
        logOut.addEventListener('click',()=>{
            localStorage.removeItem("token");
            window.location.href = "index.html";
        });
    }

    const logBtn = document.querySelector("#logBtn");
    if(logBtn){
        logBtn.addEventListener('click',loginUser);
        document.querySelector("#regBtn").addEventListener('click', registerUser);
    }

    const token = localStorage.getItem("token");
    if(token){
        updateHeaderNames(token);
    }
}

async function checkTheme() {
    try{
        const response = await axios.get(`${baseUrl}/api/site-setting`);
        console.log(response)
        const activeTheme = response.data.data.themes;

        document.body.setAttribute('data-theme', activeTheme);
    } catch (error){
        console.error("Could not load theme:", error);
    }
}

checkTheme()

checkLogIn()
