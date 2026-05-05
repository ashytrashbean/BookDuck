const baseUrl = "http://localhost:1337";


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
    let response = await axios.get(`${baseUrl}/api/books?populate=*`);
    let books = response.data.data;

    const isLoggedIn = localStorage.getItem("token") !== null;

    const bookContainer = document.querySelector('#allBooks');
    bookContainer.innerHTML = "";

    books.forEach(book => {

        const saveButton = isLoggedIn
        ? `<button type="button" onclick="saveBook('${book.documentId}')">Save to TBR</button>`
        : ``;

        bookContainer.innerHTML += `
        <div class="bookCard">
        <span>${book.author}</span>
        <h3>${book.title}</h3>
        <img src="${baseUrl}${book.cover?.url}" height="200"> <br>
        <span><strong>Pages:</strong> ${book.pages}</span>
        <span><strong>Released:</strong> ${book.release_date}</span>
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



async function renderProfile(sortBy = "title") {
    let response = await axios.get(`${baseUrl}/api/users/me`,{
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    });

    // console.log(response);

    if(response.status === 200){

        let tbr = await axios.get(`${baseUrl}/api/users/me?populate[tbr_list][populate]=cover`,{
            headers: {"Authorization": `Bearer ${localStorage.getItem("token")}`}
        });

        let myBooks = tbr.data.tbr_list;
        
        const uniqueBooks = myBooks.filter((book,index,self)=>
        index===self.findIndex((b)=>b.documentId === book.documentId));

        uniqueBooks.sort((a,b)=>{
            return a[sortBy].localeCompare(b[sortBy],'sv')
        })

        let tbrContainer = document.querySelector('#tbrDiv');
        tbrContainer.innerHTML = "";

        uniqueBooks.forEach(book => {
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

checkLogIn();
