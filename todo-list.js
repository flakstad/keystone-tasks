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
        // Enter edit mode when clicking on text
        this.enterEditMode(li);
      }
    });

    this.el.addEventListener("keydown", e => {
      const li = e.target.closest("li");
      if(!li) return;

      // If any todo is in edit mode, ignore all shortcuts except for the edit input itself
      if (this.el.querySelector("li.editing")) {
        // Only allow edit input to handle its own events
        if (!e.target.classList.contains("todo-edit-input")) {
          return;
        }
        // If this is the edit input, let it handle its own events (Enter, Escape, etc.)
        return;
      }

      const siblings = this.getSiblings(li);
      const idx = siblings.indexOf(li);

      // Enter edit mode
      if(e.key==="e" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.enterEditMode(li);
        return;
      }

      // Toggle complete
      if(e.key==="Enter" || e.key===" ") {
        e.preventDefault();
        this.toggleItem(li);
      }

      // Navigate
      if(e.key==="ArrowDown") {
        e.preventDefault();
        if(idx < siblings.length - 1) {
          siblings[idx+1].focus();
        } else {
          // last child, move to next of parent if exists
          const parentLi = li.parentNode.closest("li");
          if(parentLi) {
            const parentSiblings = Array.from(parentLi.parentNode.children).filter(c=>c.tagName==="LI");
            const parentIdx = parentSiblings.indexOf(parentLi);
            if(parentIdx < parentSiblings.length - 1) parentSiblings[parentIdx+1].focus();
          }
        }
      }

      if(e.key==="ArrowUp") {
        e.preventDefault();
        if(idx > 0) {
          siblings[idx-1].focus();
        } else {
          // first child, move focus to parent li if exists
          const parentLi = li.parentNode.closest("li");
          if(parentLi) parentLi.focus();
        }
      }

      // Navigate into first child with right arrow (if no Alt)
      // Navigate into first child with right arrow (if no Alt)
      if (!e.altKey && e.key === "ArrowRight") {
        const sublist = li.querySelector("ul");
        if (sublist && sublist.children.length > 0) {
          e.preventDefault();

          // If collapsed, expand first-level children only
          if (li.classList.contains("collapsed")) {
            this.expandItem(li); // only expands direct children
          }

          const firstChild = sublist.querySelector("li");
          if (firstChild) firstChild.focus();
        }
      }


      // Navigate back to parent with left arrow (if no Alt)
      if (!e.altKey && e.key === "ArrowLeft") {
        const parentLi = li.parentNode.closest("li");
        if (parentLi) {
          e.preventDefault();
          parentLi.focus();
        }
      }



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

    let parentLi = li.parentNode.closest("li");
    while(parentLi) {
      this.updateChildCount(parentLi);
      parentLi = parentLi.parentNode.closest("li");
    }
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

    if (parentLi) this.updateChildCount(parentLi);
  }


  indentItem(li){
    const siblings=this.getSiblings(li); const idx=siblings.indexOf(li);
    if(idx===0) return;
    const prev=siblings[idx-1];
    let sublist=prev.querySelector("ul");
    if(!sublist){ sublist=document.createElement("ul"); prev.appendChild(sublist); }
    sublist.appendChild(li); li.focus();
    this.emit("todo:indent",{id:li.dataset.id,parent:prev.dataset.id});

    this.updateChildCount(prev);
    const newParentLi = li.parentNode.closest("li");
    if (newParentLi) this.updateChildCount(newParentLi);
  }

  outdentItem(li){
    const parentUl=li.parentNode;
    if(parentUl===this.el) return;
    const parentLi=parentUl.closest("li"); const grandUl=parentLi.parentNode;
    grandUl.insertBefore(li,parentLi.nextSibling); li.focus();
    this.emit("todo:outdent",{id:li.dataset.id,newParent:grandUl.id||null});

    this.updateChildCount(parentLi);
    const newParentLi = li.parentNode.closest("li");
    if (newParentLi) this.updateChildCount(newParentLi);
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

  updateChildCount(li) {
    const sublist = li.querySelector("ul");
    let countSpan = li.querySelector(".child-count");

    if (!sublist || sublist.children.length === 0) {
        // Remove count if no children
        if (countSpan) countSpan.remove();
        return;
    }

    // Count direct children
    const children = Array.from(sublist.children).filter(c => c.tagName === "LI");
    const doneCount = children.filter(c => c.classList.contains("completed")).length;

    if (!countSpan) {
        countSpan = document.createElement("span");
        countSpan.className = "child-count";
        // Append **after the text span**
        const textSpan = li.querySelector(".todo-text");
        if (textSpan) textSpan.after(countSpan);
        else li.appendChild(countSpan);
    }

    countSpan.textContent = `[${doneCount}/${children.length}]`;
  }



  enterEditMode(li) {
    // Don't enter edit mode if already editing
    if (li.classList.contains("editing")) return;
    
    const textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;
    
    const currentText = textSpan.textContent;
    
    // Create input element
    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-edit-input";
    input.value = currentText;
    
    // Add editing class and insert input
    li.classList.add("editing");
    textSpan.after(input);
    
    // Focus and select all text
    input.focus();
    input.select();
    
    // Handle input events
    const handleKeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.saveEdit(li, input.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.exitEditMode(li);
      }
    };
    
    const handleBlur = () => {
      this.saveEdit(li, input.value);
    };
    
    input.addEventListener("keydown", handleKeydown);
    input.addEventListener("blur", handleBlur);
    
    // Store event handlers for cleanup
    input._handleKeydown = handleKeydown;
    input._handleBlur = handleBlur;
    
    this.emit("todo:edit:start", {
      id: li.dataset.id,
      originalText: currentText
    });
  }
  
  exitEditMode(li) {
    const input = li.querySelector(".todo-edit-input");
    if (!input) return;
    
    // Remove event listeners
    input.removeEventListener("keydown", input._handleKeydown);
    input.removeEventListener("blur", input._handleBlur);
    
    // Remove input and editing class
    input.remove();
    li.classList.remove("editing");
    
    // Restore focus to li
    li.focus();
    
    this.emit("todo:edit:cancel", {
      id: li.dataset.id
    });
  }
  
  saveEdit(li, newText) {
    const input = li.querySelector(".todo-edit-input");
    if (!input) return;
    
    const textSpan = li.querySelector(".todo-text");
    const originalText = textSpan.textContent;
    
    // Trim whitespace
    newText = newText.trim();
    
    // If empty, revert to original
    if (!newText) {
      newText = originalText;
    }
    
    // Update text content
    textSpan.textContent = newText;
    
    // Remove event listeners
    input.removeEventListener("keydown", input._handleKeydown);
    input.removeEventListener("blur", input._handleBlur);
    
    // Remove input and editing class
    input.remove();
    li.classList.remove("editing");
    
    // Restore focus to li
    li.focus();
    
    // Emit event if text actually changed
    if (newText !== originalText) {
      this.emit("todo:edit:save", {
        id: li.dataset.id,
        originalText: originalText,
        newText: newText
      });
    } else {
      this.emit("todo:edit:cancel", {
        id: li.dataset.id
      });
    }
  }

  emit(name,detail){ this.el.dispatchEvent(new CustomEvent(name,{detail})); }
}

window.TodoList=TodoList;
