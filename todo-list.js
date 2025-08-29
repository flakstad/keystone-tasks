class TodoList {
  constructor(el) {
    this.el = el;
    this.init();
  }

  init() {
    this.el.querySelectorAll("li").forEach(li => li.tabIndex=0);
    this.bindEvents();
  }

  bindEvents() {


    this.el.addEventListener("click", e => {
      const li = e.target.closest("li");
      if (!li) return;

      if (e.target.classList.contains("todo-label")) {
        console.log("Label clicked", li.dataset.id);
        this.toggleItem(li);  // or custom behavior for label click
      } else if (e.target.classList.contains("todo-text")) {
        console.log("Text clicked", li.dataset.id);
        // Maybe edit text, or toggle as well
        this.toggleItem(li);
      }
    });

    this.el.addEventListener("keydown", e => {
      const li = e.target.closest("li");
      if(!li) return;

      const siblings = this.getSiblings(li);
      const idx = siblings.indexOf(li);

      // Toggle complete
      if(e.key==="Enter" || e.key===" ") {
        e.preventDefault();
        this.toggleItem(li);
      }

      // Navigate
      if(e.key==="ArrowDown" && idx<siblings.length-1) siblings[idx+1].focus();
      if(e.key==="ArrowUp" && idx>0) siblings[idx-1].focus();

      // Alt keys
      if(e.altKey){
        // Reorder
        if(e.key==="ArrowUp" && idx>0){
          e.preventDefault();
          li.parentNode.insertBefore(li, siblings[idx-1]);
          li.focus();
          this.emit("todo:move",{id:li.dataset.id,from:idx,to:idx-1});
        }
        if(e.key==="ArrowDown" && idx<siblings.length-1){
          e.preventDefault();
          li.parentNode.insertBefore(siblings[idx+1], li);
          li.focus();
          this.emit("todo:move",{id:li.dataset.id,from:idx,to:idx+1});
        }
        // Hierarchy
        if(e.key==="ArrowRight"){ e.preventDefault(); this.indentItem(li); }
        if(e.key==="ArrowLeft"){ e.preventDefault(); this.outdentItem(li); }
        // Collapse / Expand
        if(e.key.toUpperCase()==="H"){ e.preventDefault(); this.collapseItem(li); }
        if(e.key.toUpperCase()==="L"){ e.preventDefault(); this.expandItem(li); }
      }
    });

    this.el.addEventListener("click", e=>{
      const li=e.target.closest("li.has-children");
      if(li && e.target === li.querySelector("::before")){ // pseudo-element won't trigger directly
        const sublist=li.querySelector("ul");
        if(sublist.style.display==="none") this.expandItem(li);
        else this.collapseItem(li);
      }
    });
  }

  getItems() { return Array.from(this.el.querySelectorAll("li")); }
  getSiblings(li){ return Array.from(li.parentNode.children).filter(c=>c.tagName==="LI"); }

  toggleItem(li) {
    const completed = li.classList.toggle("completed");
    const label = li.querySelector(".todo-label");
    if (label) label.textContent = completed ? "DONE" : "TODO";

    this.emit("todo:toggle", {
      id: li.dataset.id,
      completed: li.classList.contains("completed")
    });
  }


  addItem(text, parentLi) {
    const li = document.createElement("li");
    li.tabIndex = 0;
    li.dataset.id = crypto.randomUUID();

    // Create label span
    const label = document.createElement("span");
    label.className = "todo-label";
    label.textContent = "TODO";

    // Create text span
    const spanText = document.createElement("span");
    spanText.className = "todo-text";
    spanText.textContent = text;

    li.appendChild(label);
    li.appendChild(spanText);

    if (parentLi) {
      let sublist = parentLi.querySelector("ul");
      if (!sublist) {
        sublist = document.createElement("ul");
        parentLi.appendChild(sublist);
        parentLi.classList.add("has-children");
      }
      sublist.appendChild(li);
    } else {
      this.el.appendChild(li);
    }

    li.focus();
    this.emit("todo:add", { text, id: li.dataset.id });
  }


  indentItem(li){
    const siblings=this.getSiblings(li); const idx=siblings.indexOf(li);
    if(idx===0) return;
    const prev=siblings[idx-1];
    let sublist=prev.querySelector("ul");
    if(!sublist){ sublist=document.createElement("ul"); prev.appendChild(sublist); }
    sublist.appendChild(li); li.focus();
    this.emit("todo:indent",{id:li.dataset.id,parent:prev.dataset.id});
  }

  outdentItem(li){
    const parentUl=li.parentNode;
    if(parentUl===this.el) return;
    const parentLi=parentUl.closest("li"); const grandUl=parentLi.parentNode;
    grandUl.insertBefore(li,parentLi.nextSibling); li.focus();
    this.emit("todo:outdent",{id:li.dataset.id,newParent:grandUl.id||null});
  }

  collapseItem(li){
    const sublist=li.querySelector("ul");
    if(sublist){
        sublist.style.display="none";
        li.classList.add("collapsed");
    }
    this.emit("todo:collapse",{id:li.dataset.id});
  }

  expandItem(li){
    const sublist=li.querySelector("ul");
    if(sublist){
        sublist.style.display="block";
        li.classList.remove("collapsed");
    }
    this.emit("todo:expand",{id:li.dataset.id});
}

  emit(name,detail){ this.el.dispatchEvent(new CustomEvent(name,{detail})); }
}

window.TodoList=TodoList;
