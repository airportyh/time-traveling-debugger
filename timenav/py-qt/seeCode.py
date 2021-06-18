import sys
import sqlite3

# https://docs.python.org/3/library/sqlite3.html
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

class CodeSeer:
    def __init__(self, filename):
        self.filename = filename
        self.fun_call_level_map = {}
    
    def connect(self):
        self.conn = sqlite3.connect(self.filename)
        self.conn.row_factory = dict_factory
        self.cursor = self.conn.cursor()
    
    def key_by_id(self, records):
        retval = {}
        for item in records:
            retval[item["id"]] = item
        return retval
    
    def fetch_codes(self):
        self.fun_calls = self.key_by_id(self.cursor.execute("select * from FunCall"))
        self.fun_codes = self.key_by_id(self.cursor.execute("select * from FunCode"))
        self.code_files = self.key_by_id(self.cursor.execute("select * from CodeFile"))
    
    def fetch_snapshots(self):
        self.snapshots = list(self.cursor.execute("select * from Snapshot"))
    
    def fetch_root_code_file(self):
        self.root_code_file = list(self.cursor.execute('''
            select CodeFile.id, CodeFile.source from Snapshot 
                join FunCall on Snapshot.fun_call_id = FunCall.id 
                join FunCode on FunCall.fun_code_id = FunCode.id
                join CodeFile on FunCode.code_file_id = CodeFile.id
                where Snapshot.id = 4
        '''))[0]
        source = self.root_code_file['source']
        if source is None:
            self.code_arr = ["unavailable"]
        else:
            self.code_arr = source.split("\n")
    
    def fetch_current_snapshot(self, id):
        self.current_snapshot= list(self.cursor.execute('''
            select Snapshot.id as snapshot_id, Snapshot.line_no, CodeFile.source from Snapshot 
                join FunCall on Snapshot.fun_call_id = FunCall.id 
                join FunCode on FunCall.fun_code_id = FunCode.id
                join CodeFile on FunCode.code_file_id = CodeFile.id
                where Snapshot.id = %d
        ''' % id))[0]
    
    def fetch_snapshot_count(self):
        self.snapshot_count = list(self.cursor.execute('''
            select count(id) as len from Snapshot
        '''))[0]['len']
    
    def fetch_values(self, id):
        values = list(self.cursor.execute('''
            select Snapshot.id as snapshot_id, Funcall.locals, Funcall.globals from Snapshot 
                join FunCall on Snapshot.fun_call_id = FunCall.id
                where Snapshot.id = %d
        ''' % id))[0]
        print("VALUES", values)
        self.locals = self.getFetchValueSql(values["locals"], values["snapshot_id"])
        self.globals = self.getFetchValueSql(values["globals"], values["snapshot_id"])
        print(self.locals)
        print(self.globals)
    
    def getFetchValueSql(self, containerId, snapshotId):
        return list(self.cursor.execute('''
        with MemberValues as (
            select 
                key, 
                key_type, 
                Member.value as ref, 
                type, 
                Value.value, 
                Value.version 
            from Member 
            inner join Value on (Member.value = Value.id) 
            where container = ?
				and version <= ?
            and key >= 0
            order by key 
        ) ,
		LatestMemberValues as (
			select * from
                    (select
                        *
                        from MemberValues
                        order by version desc
                    )
					group by key
		)
		
	    select 
			case key_type
				when 0 then RealKey.value
				else key
			end as Member_key,
			case LatestMemberValues.type
				when 12  then RealValue.value
				else LatestMemberValues.value 
			end as Member_value,
           RealValue.type as Member_value_type,
		   RealValue.id as Member_value_id
		from LatestMemberValues
		
		left outer join Value as RealKey
            on (
                case LatestMemberValues.key_type
                    when 0 then LatestMemberValues.key = RealKey.id
                    else 0
                end
            )
        left outer join Value as RealValue
            on (
                case LatestMemberValues.type
                    when 12 then LatestMemberValues.value = RealValue.id
                    else 0
                end
            )
        ''', (containerId, snapshotId)))
    


def seeCode(filename):
    if not filename.endswith(".sqlite"):
        print("Please provide a .sqlite file.")
        return
    
    seer = CodeSeer(filename)
    seer.connect()
    seer.fetch_codes()
    seer.fetch_snapshots()
    seer.fetch_root_code_file()
    seer.fetch_snapshot_count()
    seer.fetch_current_snapshot(4)

    return seer
    

if __name__ == "__main__":
    seeCode()
    