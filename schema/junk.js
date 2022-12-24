const history=[]
let most_recent_query=""
history_position = 0
let query={select:[],from:[], tables:[]}
const sql=document.getElementById("sql")
for(let link of document.getElementsByTagName("area")){
    link.onclick = function(){amend_sql(this.title)}
}
function clear_sql(){
    sql.value = ""
    monaco.editor.getModels()[0].setValue('')
    query.select = []
    query.from = []
    query.tables = []
}

function add_field(table,field){
   //console.log("table",table)
   //console.log("field",field)
    if(query.select.indexOf(table + "." + field)>-1){return}
    if(query.tables.length===0){
        //query is empty, just build the query
        query.select.push(table + "." + field)        
        query.tables.push(table) 
        query.from.push(table)  
        return
    }else if(query.tables.indexOf(table)===-1){
        // query already has some data and the table specified is nit in the list of tables, can't add field
        return "Cannot add table to query.  Try clicking ON a link instead."
    }else if(field==="*"){
        // we already have 
        return "Cannot add table to query.  Try clicking ON a field instead."
    }else if(query.select.length===1 && query.select[0]==="*"){
        // there is currently only one field, and it is start.  neex to replace
        query.select[0]=table + "." + field
    }else{ 
        // must have been a field in one of the tables in the query
        //if we already have a *, get shod of it
        if(query.select.length===1 && query.select[0].substr(query.select[0].length-2,2)===".*"){query.select.shift()}
        query.select.push(table + "." + field)        
    }
}

function amend_sql(fragment) {
   //console.log("sql", sql.value)
   //console.log("fragment", fragment)
   if(most_recent_query==='' && monaco.editor.getModels()[0].getValue()!==""){
    alert("Clicking on the diagram is only allowed when you start with a blank query.")
    return
   }
   if(!(most_recent_query===monaco.editor.getModels()[0].getValue()||monaco.editor.getModels()[0].getValue()==="")){
    alert("Clicking on the diagram is disabled once you change the query by hand.")
    return
   }
    let message=""
//        let fieldname = fragment
//        let tablename = fragment
    if(fragment.indexOf(".")===-1){
        // we have a table only
        message = add_field(fragment,"*")
        if(message){
            alert(message)
            return
        }
    }else if(fragment.indexOf(" JOIN ")===-1){ 
        // we have a dot in in the title and no join, it must be a field
       //console.log("trying to add a field")
        message = add_field(fragment.split(".")[0],fragment.split(".")[1])
        if(message){
            alert(message)
            return
        }

    }else{ 
        // atom is a link
        // find the talbes in the link
        let temp=fragment.replace(" JOIN "," ").split(" ")
        let match_count=0
        let table_to_add
        const table1=temp[0]
        const table2=temp[1]

        if(query.tables.length===0){
            // query is empty, configure from scratch
            message = add_field(table1,"*")
            if(message){
                alert(message)
                return
            }
            // now get ready to add the join clause
            let frag=fragment.split(" ON ")[1]
           //console.log("frag",frag)
            // push the rest into the next entry
            query.from.push("  JOIN  " + table2+  "\n    ON  " + frag)
            query.tables.push(table2)        

        }else{
            //there is already a table in the query.  need to check to see if atom join makes sense
           //console.log("fragment----->",fragment)
            for(const tname of query.tables){
               //console.log("tname",tname)
               //console.log("table1",table1)
               //console.log("table2",table2)
                if(tname===table1){
                    match_count++
                   //console.log(tname, "is already in the query")
                    table_to_add=table2
                }
                if(tname===table2){
                    match_count++
                   //console.log(tname, "is already in the query")
                    table_to_add=table1
                }
            }
           //console.log("table_to_add",table_to_add)
            if(match_count===0){
                alert('Neither "' + table1 + '" nor "' + table2 + '" is already in the query, so we cannot add the selected join.')
            }else if(match_count===1){
               //console.log("ready to add", fragment)
                query.from.push("  JOIN  " + table_to_add + "\n    ON  " + fragment.split(" ON ")[1].replace(/ AND /g, '\n    AND '))
                query.tables.push(table_to_add)
            }else{
                alert('Both "' + table1 + '" and "' + table2 + '" are already in the query, so we cannot add the selected join.')

            }
        }
    }

    // you always wanted to be able to change history, now you can
    if(history_position < history.length-1){history.splice(history_position+1)}   // get rid of old history     

    if(JSON.stringify(query)!==history[history.length-1]){
        history.push(JSON.stringify(query))
        history_position = history.length-1
    }

    write_query()        

    return false;

}
function write_query(){
    let local_sql="SELECT  "
   //console.log("query",query)
    // write out the query
    for(let x=0;x<query.select.length;x++){
        if(x>0){local_sql += "\n        ,"}
        if(query.select[x].indexOf(".")===-1){
            local_sql +=  query.select[x]  // there is no prefix, show the whole thing.   should only happen when value is "*"
        }else if(query.tables.length===1){
            local_sql += query.select[x].split(".")[1]// there is only one table, no need to prefix
        }else{
            local_sql += query.select[x]// multiple tables, let's add prefixes
        }
    }
    for(let x=0;x<query.from.length;x++){
        local_sql += "\n"
        if(x===0){local_sql +="FROM    "}
        local_sql += query.from[x] 
    }
    sql.value=local_sql
    monaco.editor.getModels()[0].setValue(local_sql)
    most_recent_query=local_sql
}
function copyMe(element){
    let copier = document.getElementById(element)
    copier.disabled=false
    copier.select()
    document.execCommand('copy')
    copier.disabled=true
    //document.getElementById("msg").innerHTML="Copied to the clipboard: " + fragment
}

function undo(){
    if(history_position===0){
        sql.value="" 
        monaco.editor.getModels()[0].setValue('') 
        query={select:[],from:[], tables:[]}
    }else if(history_position>0){
        history_position = history_position -1
        query=JSON.parse(history[history_position])
        write_query()
    }
}

function redo(){
    if(history_position < history.length-1){
        history_position = history_position + 1
        query=JSON.parse(history[history_position])
        write_query()
    }
}

