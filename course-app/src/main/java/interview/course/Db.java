package interview.course;

import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Component;

@Component
public class Db {
    final JdbcTemplate jdbc;
    public Db(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<Map<String,Object>> rows(String sql,Object... args) {
        return jdbc.query(sql,(rs,n)-> {
            Map<String,Object> row=new LinkedHashMap<>();
            var md=rs.getMetaData();
            for(int i=1;i<=md.getColumnCount();i++) {
                String key=md.getColumnLabel(i).toLowerCase(Locale.ROOT);
                StringBuilder camel=new StringBuilder(); boolean upper=false;
                for(char c:key.toCharArray()) { if(c=='_') upper=true; else { camel.append(upper?Character.toUpperCase(c):c); upper=false; } }
                Object value=rs.getObject(i);
                if(value instanceof Timestamp t) value=t.toInstant().toString();
                else if(value instanceof java.time.LocalDateTime d) value=d.toInstant(java.time.ZoneOffset.UTC).toString();
                else if(value instanceof java.sql.Date d) value=d.toLocalDate().toString();
                row.put(camel.toString(),value);
            }
            return row;
        },args);
    }
    public Map<String,Object> one(String sql,Object... args) {
        var rows=rows(sql,args); if(rows.isEmpty()) throw new Api.Failure(404,"记录不存在"); return rows.getFirst();
    }
    public long count(String sql,Object... args) { Long n=jdbc.queryForObject(sql,Long.class,args); return n==null?0:n; }
    public int update(String sql,Object... args) { return jdbc.update(sql,args); }
    public long insert(String sql,Object... args) {
        var key=new GeneratedKeyHolder();
        jdbc.update(c->{ var ps=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS); for(int i=0;i<args.length;i++) ps.setObject(i+1,args[i]); return ps; },key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    public static long id(Map<String,Object> row,String key) { return ((Number)row.get(key)).longValue(); }
    public static boolean truth(Object v) { return Boolean.TRUE.equals(v) || v instanceof Number n && n.intValue()!=0; }
}
